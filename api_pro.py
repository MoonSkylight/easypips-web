from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Dict, Any
from jose import jwt, JWTError
import os
import math
import hashlib
import requests
import tempfile
import matplotlib.pyplot as plt
import yfinance as yf
import pandas as pd
from supabase import create_client, Client

app = FastAPI(title="EasyPips Pro Signals API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-this-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

MIN_SIGNAL_SCORE = int(os.environ.get("MIN_SIGNAL_SCORE", "75"))
MAX_SIGNALS_PER_DAY = int(os.environ.get("MAX_SIGNALS_PER_DAY", "8"))
SIGNAL_COOLDOWN_MINUTES = int(os.environ.get("SIGNAL_COOLDOWN_MINUTES", "90"))
MAX_AI_SIGNALS_PER_STRATEGY = int(os.environ.get("MAX_AI_SIGNALS_PER_STRATEGY", "6"))

supabase: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

Price = Union[str, float, int]

SYMBOLS = {
    "EUR/USD": "EURUSD=X",
    "GBP/USD": "GBPUSD=X",
    "AUD/USD": "AUDUSD=X",
    "NZD/USD": "NZDUSD=X",
    "USD/JPY": "JPY=X",
    "USD/CHF": "CHF=X",
    "USD/CAD": "CAD=X",
    "XAU/USD": "GC=F",
    "BTC/USD": "BTC-USD",
}


class ManualSignal(BaseModel):
    symbol: str
    direction: str
    entry: Price
    sl: Price
    tp1: Price
    tp2: Price
    tp3: Price
    analyst: Optional[str] = "EasyPips Analyst"
    note: Optional[str] = ""


class AdminLogin(BaseModel):
    username: str
    password: str


class ClientAccountRequest(BaseModel):
    name: str
    platform: str
    broker: Optional[str] = ""
    account_login: Optional[str] = ""
    risk_mode: Optional[str] = "manual"
    max_lot: Optional[float] = 0.01
    consent: Optional[bool] = False



class AdminAccountUpdate(BaseModel):
    risk_mode: Optional[str] = None
    max_lot: Optional[float] = None
    status: Optional[str] = None



class ClientRegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""
    account_id: Optional[str] = None


class ClientLoginRequest(BaseModel):
    email: str
    password: str


class TradeHistoryRequest(BaseModel):
    account_id: str
    signal_id: Optional[str] = None
    symbol: str
    direction: str
    entry: float
    sl: Optional[float] = None
    tp: Optional[float] = None
    result: Optional[str] = "OPEN"
    profit_loss: Optional[float] = 0
    balance_after: Optional[float] = None
    closed_at: Optional[str] = None


def db_enabled():
    return supabase is not None



def log_action(account_id: str, action: str, details: dict):
    """
    Saves admin/client safety actions to audit_logs.
    This is important before real MT4/MT5 auto-execution.
    """
    if not db_enabled():
        return

    try:
        supabase.table("audit_logs").insert({
            "account_id": account_id,
            "action": action,
            "details": details,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        print("Audit log error:", e)



def hash_password(password: str) -> str:
    secret = JWT_SECRET or "default-client-secret"
    return hashlib.sha256(f"{password}:{secret}".encode("utf-8")).hexdigest()


def create_client_token(client_user: dict):
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": client_user.get("email"),
        "role": "client",
        "client_id": client_user.get("id"),
        "account_id": client_user.get("account_id"),
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_client_token(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing client token")

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "client":
            raise HTTPException(status_code=403, detail="Not client")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired client token")


def get_client_user_by_id(client_id: str):
    if not db_enabled():
        return None

    rows = (
        supabase.table("client_users")
        .select("*")
        .eq("id", client_id)
        .execute()
        .data
        or []
    )

    return rows[0] if rows else None


def calculate_equity_summary(trades: list):
    closed = [t for t in trades if t.get("result") in ["TP", "TP3", "SL", "WIN", "LOSS", "CLOSED"] or t.get("closed_at")]
    total_profit = round(sum(float(t.get("profit_loss") or 0) for t in closed), 2)

    wins = [t for t in closed if float(t.get("profit_loss") or 0) > 0 or str(t.get("result", "")).upper() in ["TP", "TP3", "WIN"]]
    losses = [t for t in closed if float(t.get("profit_loss") or 0) < 0 or str(t.get("result", "")).upper() in ["SL", "LOSS"]]

    win_rate = round((len(wins) / len(closed)) * 100, 2) if closed else 0

    curve = []
    peak = None
    max_drawdown = 0.0

    for t in sorted(closed, key=lambda x: x.get("closed_at") or x.get("created_at") or ""):
        balance = t.get("balance_after")
        if balance is None:
            continue
        balance = float(balance)
        curve.append({
            "time": t.get("closed_at") or t.get("created_at"),
            "balance": balance,
            "profit_loss": float(t.get("profit_loss") or 0),
            "symbol": t.get("symbol"),
            "result": t.get("result"),
        })

        if peak is None or balance > peak:
            peak = balance

        if peak and peak > 0:
            drawdown = ((peak - balance) / peak) * 100
            max_drawdown = max(max_drawdown, drawdown)

    starting_balance = curve[0]["balance"] - curve[0]["profit_loss"] if curve else 0
    current_balance = curve[-1]["balance"] if curve else 0
    growth = round(((current_balance - starting_balance) / starting_balance) * 100, 2) if starting_balance else 0

    best_trade = max(closed, key=lambda x: float(x.get("profit_loss") or 0), default=None)
    worst_trade = min(closed, key=lambda x: float(x.get("profit_loss") or 0), default=None)

    return {
        "totalTrades": len(trades),
        "closedTrades": len(closed),
        "wins": len(wins),
        "losses": len(losses),
        "winRate": win_rate,
        "totalProfitLoss": total_profit,
        "startingBalance": round(starting_balance, 2),
        "currentBalance": round(current_balance, 2),
        "growthPercent": growth,
        "maxDrawdownPercent": round(max_drawdown, 2),
        "bestTrade": best_trade,
        "worstTrade": worst_trade,
        "curve": curve,
    }



def send_telegram(message: str):
    """
    Telegram sender with premium Markdown formatting.
    If Markdown fails, it retries as plain text so alerts are not lost.
    """
    try:
        bot_token = TELEGRAM_BOT_TOKEN or os.getenv("TELEGRAM_BOT_TOKEN")
        chat_id = TELEGRAM_CHAT_ID or os.getenv("TELEGRAM_CHAT_ID")

        if not bot_token or not chat_id:
            print("Telegram skipped: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID")
            return False

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"

        payload = {
            "chat_id": chat_id,
            "text": str(message),
            "parse_mode": "Markdown",
            "disable_web_page_preview": True,
        }

        response = requests.post(url, json=payload, timeout=15)

        if response.status_code == 200:
            print("Telegram sent successfully")
            return True

        print("Telegram Markdown failed, retrying plain text:", response.status_code, response.text)

        plain_payload = {
            "chat_id": chat_id,
            "text": str(message).replace("*", "").replace("`", ""),
            "disable_web_page_preview": True,
        }

        plain_response = requests.post(url, json=plain_payload, timeout=15)

        if plain_response.status_code != 200:
            print("Telegram plain send failed:", plain_response.status_code, plain_response.text)
            return False

        print("Telegram sent successfully as plain text")
        return True

    except Exception as e:
        print("Telegram exception:", str(e))
        return False

def format_signal_message(signal: dict):
    symbol = signal.get("symbol") or signal.get("pair") or "-"
    direction = signal.get("direction") or signal.get("type") or "-"
    entry = signal.get("entry") or signal.get("entry_price") or "-"
    sl = signal.get("sl") or signal.get("stop_loss") or "-"
    tp = (
        signal.get("tp3")
        or signal.get("tp2")
        or signal.get("tp1")
        or signal.get("tp")
        or signal.get("take_profit")
        or "-"
    )
    strategy = signal.get("strategy") or signal.get("desk") or signal.get("source") or "EasyPips"

    return f"""EASY PIPS NEW SIGNAL

Source: {strategy}
Symbol: {symbol}
Direction: {direction}
Entry: {entry}
SL: {sl}
TP: {tp}

Educational only. Trading involves risk."""


def create_chart(symbol: str, yahoo_symbol: str):
    try:
        if not yahoo_symbol:
            return None

        data = yf.Ticker(yahoo_symbol).history(period="1d", interval="15m")

        if data.empty:
            return None

        file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")

        plt.figure(figsize=(9, 4.5))
        plt.plot(data.index, data["Close"], linewidth=2)
        plt.title(f"{symbol} Live Chart")
        plt.xlabel("Time")
        plt.ylabel("Price")
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(file.name, dpi=150)
        plt.close()

        return file.name

    except Exception as e:
        print("Chart error:", e)
        return None


def send_telegram_image(message: str, image_path: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID or not image_path:
        send_telegram(message)
        return

    try:
        with open(image_path, "rb") as photo:
            requests.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto",
                data={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "caption": message,
                    "parse_mode": "Markdown",
                },
                files={"photo": photo},
                timeout=20,
            )
    except Exception as e:
        print("Telegram image error:", e)
        send_telegram(message)


def new_signal_message(signal: dict):
    source = signal.get("desk") or signal.get("strategy") or signal.get("source") or "EasyPips"
    return f"""
🚀 *EASY PIPS VIP SIGNAL*

━━━━━━━━━━━━━━━

📊 *Pair:* {signal.get("symbol")}
📈 *Direction:* {signal.get("direction")}
🧠 *Source:* {source}
📌 *Pattern:* {signal.get("pattern", "manual_signal")}
⭐ *Score:* {signal.get("score", "N/A")}

━━━━━━━━━━━━━━━

🎯 *ENTRY:* `{signal.get("entry")}`
🛑 *STOP LOSS:* `{signal.get("sl")}`

💰 *TP1:* `{signal.get("tp1")}`
💰 *TP2:* `{signal.get("tp2")}`
💰 *TP3:* `{signal.get("tp3")}`

━━━━━━━━━━━━━━━

📊 Confidence: *{signal.get("confidence", "N/A")}*
⚠️ Educational only. Trading involves risk.
"""

def result_message(signal: dict, result: str):
    emoji = "✅"

    if result == "TP2":
        emoji = "🚀"
    elif result == "TP3":
        emoji = "🔥"
    elif result == "SL":
        emoji = "❌"

    return f"""
{emoji} *EASY PIPS SIGNAL UPDATE*

━━━━━━━━━━━━━━━

📊 *Pair:* {signal.get("symbol")}
📈 *Direction:* {signal.get("direction")}
🧠 *Strategy:* {signal.get("strategy", "Strategy A")}
🎯 *Result:* {result}

━━━━━━━━━━━━━━━

Entry: `{signal.get("entry")}`
SL: `{signal.get("sl")}`

TP1: `{signal.get("tp1")}`
TP2: `{signal.get("tp2")}`
TP3: `{signal.get("tp3")}`

━━━━━━━━━━━━━━━

📌 Status: *{signal.get("status", "ACTIVE")}*
"""


def create_admin_token():
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": "admin", "role": "admin", "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_admin_token(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing admin token")

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not admin")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def format_price(symbol: str, price: float) -> str:
    if price is None:
        return ""

    if "JPY" in symbol:
        return f"{price:.3f}"

    if "XAU" in symbol or "BTC" in symbol:
        return f"{price:.2f}"

    return f"{price:.5f}"


def pip_size(symbol: str) -> float:
    if "JPY" in symbol:
        return 0.01
    if "XAU" in symbol:
        return 0.10
    if "BTC" in symbol:
        return 10.0
    return 0.0001


def target_distance(symbol: str) -> float:
    return pip_size(symbol) * 100


def get_live_price(yahoo_symbol: str):
    try:
        data = yf.Ticker(yahoo_symbol).history(period="2d", interval="15m")

        if data.empty:
            return None, None

        current_price = float(data["Close"].iloc[-1])
        previous_price = float(data["Close"].iloc[-5]) if len(data) >= 5 else float(data["Close"].iloc[0])

        return current_price, previous_price

    except Exception:
        return None, None


def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss.replace(0, pd.NA)
    rsi = 100 - (100 / (1 + rs))

    return rsi.fillna(50)


def calculate_atr(data, period=14):
    high_low = data["High"] - data["Low"]
    high_close = (data["High"] - data["Close"].shift()).abs()
    low_close = (data["Low"] - data["Close"].shift()).abs()

    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)

    return tr.rolling(period).mean().fillna(tr.mean())


def analyze_strategy_a(symbol: str, yahoo_symbol: str):
    try:
        data = yf.Ticker(yahoo_symbol).history(period="5d", interval="15m")

        if data.empty or len(data) < 80:
            return None

        close = data["Close"]
        ema20 = close.ewm(span=20, adjust=False).mean()
        ema50 = close.ewm(span=50, adjust=False).mean()
        rsi = calculate_rsi(close)

        price = float(close.iloc[-1])
        previous = float(close.iloc[-5])
        e20 = float(ema20.iloc[-1])
        e50 = float(ema50.iloc[-1])
        current_rsi = float(rsi.iloc[-1])
        momentum = price - previous

        if price > e50 and e20 > e50 and 50 <= current_rsi <= 70 and momentum > 0:
            confidence = min(95, int(80 + (current_rsi - 50)))
            return {
                "strategy": "Strategy A",
                "pattern": "ema_rsi_momentum_buy",
                "direction": "BUY",
                "price": price,
                "confidence": confidence,
                "score": confidence,
                "note": f"EMA bullish trend, RSI {round(current_rsi, 2)}, positive momentum.",
            }

        if price < e50 and e20 < e50 and 30 <= current_rsi <= 50 and momentum < 0:
            confidence = min(95, int(80 + (50 - current_rsi)))
            return {
                "strategy": "Strategy A",
                "pattern": "ema_rsi_momentum_sell",
                "direction": "SELL",
                "price": price,
                "confidence": confidence,
                "score": confidence,
                "note": f"EMA bearish trend, RSI {round(current_rsi, 2)}, negative momentum.",
            }

        return None

    except Exception as e:
        print("Strategy A error:", e)
        return None


def detect_swings(data, lookback=3):
    swings = []

    for i in range(lookback, len(data) - lookback):
        window = data.iloc[i - lookback : i + lookback + 1]
        candle = data.iloc[i]

        if candle["High"] == window["High"].max():
            swings.append({"index": i, "type": "high", "price": float(candle["High"])})

        if candle["Low"] == window["Low"].min():
            swings.append({"index": i, "type": "low", "price": float(candle["Low"])})

    return sorted(swings, key=lambda x: x["index"])


def latest_swing_range(swings):
    latest_low = None
    latest_high = None

    for swing in reversed(swings):
        if swing["type"] == "low" and latest_low is None:
            latest_low = swing
        elif swing["type"] == "high" and latest_high is None:
            latest_high = swing

        if latest_low and latest_high:
            return latest_low, latest_high

    return None, None


def fib_levels(low: float, high: float, direction: str):
    move = high - low

    if move <= 0:
        return {}

    levels = {}

    retracements = {
        "0.382": 0.382,
        "0.500": 0.500,
        "0.618": 0.618,
        "0.786": 0.786,
    }

    extensions = {
        "1.000": 1.000,
        "1.272": 1.272,
        "1.618": 1.618,
    }

    if direction == "BUY":
        for name, value in retracements.items():
            levels[name] = high - move * value
        for name, value in extensions.items():
            levels[f"ext_{name}"] = low + move * value

    if direction == "SELL":
        for name, value in retracements.items():
            levels[name] = low + move * value
        for name, value in extensions.items():
            levels[f"ext_{name}"] = high - move * value

    return levels


def nearest_fib_match(price: float, levels: dict, atr: float):
    tolerance = max(atr * 0.35, price * 0.0003)

    best_name = None
    best_price = None
    best_distance = math.inf

    for name, level_price in levels.items():
        if name.startswith("ext_"):
            continue

        distance = abs(price - level_price)

        if distance <= tolerance and distance < best_distance:
            best_name = name
            best_price = level_price
            best_distance = distance

    return best_name, best_price, best_distance, tolerance


def bullish_confirmation(data):
    last = data.iloc[-1]
    prev = data.iloc[-2]

    bullish_close = last["Close"] > last["Open"]
    close_above_mid = last["Close"] > (last["High"] + last["Low"]) / 2
    close_above_prev = last["Close"] >= prev["Close"]

    return bool(bullish_close and close_above_mid and close_above_prev)


def bearish_confirmation(data):
    last = data.iloc[-1]
    prev = data.iloc[-2]

    bearish_close = last["Close"] < last["Open"]
    close_below_mid = last["Close"] < (last["High"] + last["Low"]) / 2
    close_below_prev = last["Close"] <= prev["Close"]

    return bool(bearish_close and close_below_mid and close_below_prev)


def risk_reward(entry: float, stop: float, target: float, direction: str):
    if direction == "BUY":
        risk = entry - stop
        reward = target - entry
    else:
        risk = stop - entry
        reward = entry - target

    if risk <= 0:
        return 0.0

    return reward / risk


def analyze_strategy_b(symbol: str, yahoo_symbol: str):
    try:
        data = yf.Ticker(yahoo_symbol).history(period="15d", interval="15m")

        if data.empty or len(data) < 220:
            return None

        data = data.dropna().copy()

        data["ema50"] = data["Close"].ewm(span=50, adjust=False).mean()
        data["ema200"] = data["Close"].ewm(span=200, adjust=False).mean()
        data["atr"] = calculate_atr(data)

        latest = data.iloc[-1]

        price = float(latest["Close"])
        atr = float(latest["atr"])

        if not atr or math.isnan(atr):
            return None

        trend = "sideways"

        if price > float(latest["ema50"]) > float(latest["ema200"]):
            trend = "bullish"
        elif price < float(latest["ema50"]) < float(latest["ema200"]):
            trend = "bearish"

        swings = detect_swings(data)
        swing_low, swing_high = latest_swing_range(swings)

        if not swing_low or not swing_high:
            return None

        low = float(swing_low["price"])
        high = float(swing_high["price"])

        if trend == "bullish" and swing_low["index"] < swing_high["index"]:
            levels = fib_levels(low, high, "BUY")
            fib_name, fib_price, distance, tolerance = nearest_fib_match(price, levels, atr)

            if fib_name and bullish_confirmation(data):
                stop = min(low, price - atr * 1.2)
                tp1 = levels.get("ext_1.000", high)
                tp2 = levels.get("ext_1.272", high + (high - low) * 0.272)
                tp3 = levels.get("ext_1.618", high + (high - low) * 0.618)

                rr = risk_reward(price, stop, tp1, "BUY")

                if rr >= 1.2:
                    confidence = 82

                    if fib_name in ["0.500", "0.618"]:
                        confidence += 10

                    confidence += min(8, int(rr * 2))

                    return {
                        "strategy": "Strategy B",
                        "pattern": "bullish_fib_pullback",
                        "direction": "BUY",
                        "price": price,
                        "sl": stop,
                        "tp1": tp1,
                        "tp2": tp2,
                        "tp3": tp3,
                        "confidence": min(98, confidence),
                        "score": min(98, confidence),
                        "note": f"Bullish Fibonacci pullback confirmed at Fib {fib_name}. RR {round(rr, 2)}.",
                    }

        if trend == "bearish" and swing_high["index"] < swing_low["index"]:
            levels = fib_levels(low, high, "SELL")
            fib_name, fib_price, distance, tolerance = nearest_fib_match(price, levels, atr)

            if fib_name and bearish_confirmation(data):
                stop = max(high, price + atr * 1.2)
                tp1 = levels.get("ext_1.000", low)
                tp2 = levels.get("ext_1.272", low - (high - low) * 0.272)
                tp3 = levels.get("ext_1.618", low - (high - low) * 0.618)

                rr = risk_reward(price, stop, tp1, "SELL")

                if rr >= 1.2:
                    confidence = 82

                    if fib_name in ["0.500", "0.618"]:
                        confidence += 10

                    confidence += min(8, int(rr * 2))

                    return {
                        "strategy": "Strategy B",
                        "pattern": "bearish_fib_pullback",
                        "direction": "SELL",
                        "price": price,
                        "sl": stop,
                        "tp1": tp1,
                        "tp2": tp2,
                        "tp3": tp3,
                        "confidence": min(98, confidence),
                        "score": min(98, confidence),
                        "note": f"Bearish Fibonacci pullback confirmed at Fib {fib_name}. RR {round(rr, 2)}.",
                    }

        return None

    except Exception as e:
        print("Strategy B error:", e)
        return None


def build_ai_signal(symbol: str, analysis: dict):
    price = analysis["price"]
    direction = analysis["direction"]
    strategy = analysis["strategy"]

    if strategy == "Strategy B" and all(k in analysis for k in ["sl", "tp1", "tp2", "tp3"]):
        sl = analysis["sl"]
        tp1 = analysis["tp1"]
        tp2 = analysis["tp2"]
        tp3 = analysis["tp3"]
    else:
        distance = target_distance(symbol)

        if direction == "BUY":
            sl = price - distance
            tp1 = price + distance
            tp2 = price + distance * 2
            tp3 = price + distance * 3
        else:
            sl = price + distance
            tp1 = price - distance
            tp2 = price - distance * 2
            tp3 = price - distance * 3

    return {
        "source": "AI Engine",
        "desk": None,
        "strategy": strategy,
        "pattern": analysis.get("pattern"),
        "timeframe": "15m",
        "symbol": symbol,
        "direction": direction,
        "entry": format_price(symbol, price),
        "sl": format_price(symbol, sl),
        "tp1": format_price(symbol, tp1),
        "tp2": format_price(symbol, tp2),
        "tp3": format_price(symbol, tp3),
        "confidence": analysis.get("confidence", 80),
        "score": analysis.get("score", analysis.get("confidence", 80)),
        "analyst": "AI Strategy Engine",
        "note": analysis.get("note", ""),
        "status": "ACTIVE",
        "result": "RUNNING",
        "hit_tp1": False,
        "hit_tp2": False,
        "hit_tp3": False,
        "hit_sl": False,
    }


def get_all_signals():
    if not db_enabled():
        return []

    response = (
        supabase.table("signals")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    return response.data or []


def get_active_signals(source=None, desk=None, strategy=None):
    if not db_enabled():
        return []

    query = supabase.table("signals").select("*").eq("status", "ACTIVE")

    if source:
        query = query.eq("source", source)

    if desk:
        query = query.eq("desk", desk)

    if strategy:
        query = query.eq("strategy", strategy)

    response = query.order("created_at", desc=True).execute()

    return response.data or []


def count_today_approved_signals():
    if not db_enabled():
        return 0

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    response = (
        supabase.table("signals")
        .select("id")
        .eq("source", "AI Engine")
        .eq("status", "ACTIVE")
        .gte("created_at", today_start.isoformat())
        .execute()
    )

    return len(response.data or [])




def active_duplicate_signal_exists(signal: dict):
    """
    Prevent repeated active duplicates from being inserted/broadcast.
    Duplicate definition: same source/desk/strategy/symbol/direction/entry and ACTIVE.
    """
    if not db_enabled():
        return None

    try:
        query = (
            supabase.table("signals")
            .select("*")
            .eq("status", "ACTIVE")
            .eq("symbol", signal.get("symbol"))
            .eq("direction", signal.get("direction"))
            .eq("entry", str(signal.get("entry")))
        )

        if signal.get("source"):
            query = query.eq("source", signal.get("source"))
        if signal.get("desk"):
            query = query.eq("desk", signal.get("desk"))
        if signal.get("strategy"):
            query = query.eq("strategy", signal.get("strategy"))

        response = query.order("created_at", desc=True).limit(1).execute()
        rows = response.data or []
        return rows[0] if rows else None
    except Exception as e:
        print("Duplicate check failed:", str(e))
        return None


def mark_signal_telegram_sent(signal_id: str):
    if not db_enabled() or not signal_id:
        return

    try:
        supabase.table("signals").update({"telegram_sent": True}).eq("id", signal_id).execute()
    except Exception as e:
        print("telegram_sent update failed:", str(e))


def active_strategy_signal_exists(symbol: str, strategy: str):
    active = get_active_signals(source="AI Engine", strategy=strategy)
    return any(s.get("symbol") == symbol for s in active)


def cooldown_duplicate_exists(symbol: str, strategy: str, direction: str):
    if not db_enabled():
        return False

    since = datetime.now(timezone.utc) - timedelta(minutes=SIGNAL_COOLDOWN_MINUTES)

    response = (
        supabase.table("signals")
        .select("id")
        .eq("symbol", symbol)
        .eq("strategy", strategy)
        .eq("direction", direction)
        .gte("created_at", since.isoformat())
        .execute()
    )

    return len(response.data or []) > 0


def save_rejected_signal(signal: dict, reason: str):
    if not db_enabled():
        return

    rejected = signal.copy()
    rejected["status"] = "REJECTED"
    rejected["result"] = "REJECTED"
    rejected["reject_reason"] = reason

    try:
        supabase.table("signals").insert(rejected).execute()
    except Exception as e:
        print("Rejected signal save error:", e)


def quality_gate(signal: dict):
    score = int(signal.get("score") or 0)

    if score < MIN_SIGNAL_SCORE:
        return False, f"Score too low: {score}"

    if count_today_approved_signals() >= MAX_SIGNALS_PER_DAY:
        return False, "Daily AI signal limit reached"

    if cooldown_duplicate_exists(
        symbol=signal.get("symbol"),
        strategy=signal.get("strategy"),
        direction=signal.get("direction"),
    ):
        return False, "Duplicate cooldown active"

    return True, "Approved"


def send_new_signal_with_chart(saved: dict):
    chart = create_chart(saved.get("symbol"), SYMBOLS.get(saved.get("symbol")))

    if chart:
        send_telegram_image(new_signal_message(saved), chart)
    else:
        send_telegram(new_signal_message(saved))


def insert_signal(signal: dict, send_alert: bool = True):
    """
    Insert a signal once and send Telegram once.
    If the same ACTIVE signal already exists, return it and do NOT resend Telegram.
    """
    if not db_enabled():
        if send_alert:
            send_new_signal_with_chart(signal)
        return signal

    duplicate = active_duplicate_signal_exists(signal)
    if duplicate:
        print("Duplicate active signal skipped:", duplicate.get("id"))
        return duplicate

    try:
        signal["telegram_sent"] = False
    except Exception:
        pass

    response = supabase.table("signals").insert(signal).execute()

    if response.data:
        saved = response.data[0]

        if send_alert and not saved.get("telegram_sent"):
            ok = False
            try:
                send_new_signal_with_chart(saved)
                ok = True
            except Exception as e:
                print("Telegram send after insert failed:", str(e))

            if ok:
                mark_signal_telegram_sent(saved.get("id"))
                saved["telegram_sent"] = True

        return saved

    return signal

def approve_and_insert_signal(signal: dict):
    approved, reason = quality_gate(signal)

    if not approved:
        save_rejected_signal(signal, reason)
        return False, reason

    insert_signal(signal, send_alert=True)

    return True, "Approved"


def generate_strategy_a_signals():
    created = 0
    rejected = 0

    for symbol, yahoo_symbol in SYMBOLS.items():
        if active_strategy_signal_exists(symbol, "Strategy A"):
            continue

        if len(get_active_signals(source="AI Engine", strategy="Strategy A")) >= MAX_AI_SIGNALS_PER_STRATEGY:
            break

        analysis = analyze_strategy_a(symbol, yahoo_symbol)

        if not analysis:
            continue

        signal = build_ai_signal(symbol, analysis)
        approved, reason = approve_and_insert_signal(signal)

        if approved:
            created += 1
        else:
            rejected += 1
            print("Strategy A rejected:", symbol, reason)

    return {"created": created, "rejected": rejected}


def generate_strategy_b_signals():
    created = 0
    rejected = 0

    for symbol, yahoo_symbol in SYMBOLS.items():
        if active_strategy_signal_exists(symbol, "Strategy B"):
            continue

        if len(get_active_signals(source="AI Engine", strategy="Strategy B")) >= MAX_AI_SIGNALS_PER_STRATEGY:
            break

        analysis = analyze_strategy_b(symbol, yahoo_symbol)

        if not analysis:
            continue

        signal = build_ai_signal(symbol, analysis)
        approved, reason = approve_and_insert_signal(signal)

        if approved:
            created += 1
        else:
            rejected += 1
            print("Strategy B rejected:", symbol, reason)

    return {"created": created, "rejected": rejected}


def safe_float(value):
    try:
        return float(value)
    except Exception:
        return None



def get_price_range_since_signal(yahoo_symbol: str, created_at: str):
    """
    Checks candle High/Low after the signal was created.
    This is more accurate than checking only the latest live price,
    because TP/SL may have been touched between cron checks.
    """
    try:
        data = yf.Ticker(yahoo_symbol).history(period="7d", interval="15m")

        if data.empty:
            return None, None

        if created_at:
            signal_time = parse_datetime(created_at)

            # yfinance index is usually timezone-aware. Align safely.
            if data.index.tz is None:
                signal_time = signal_time.replace(tzinfo=None)

            data = data[data.index >= signal_time]

        if data.empty:
            return None, None

        highest = float(data["High"].max())
        lowest = float(data["Low"].min())

        return highest, lowest

    except Exception as e:
        print("Range check error:", e)
        return None, None



def get_candles_since_signal(yahoo_symbol: str, created_at: str):
    """
    Returns 15m candles after the signal was created.
    Used to check TP/SL in real candle order, so SL cannot wrongly override TP.
    """
    try:
        data = yf.Ticker(yahoo_symbol).history(period="7d", interval="15m")

        if data.empty:
            return None

        if created_at:
            signal_time = parse_datetime(created_at)
            data = data.copy()
            data.index = pd.to_datetime(data.index, utc=True)
            signal_time = pd.to_datetime(signal_time, utc=True)
            data = data[data.index >= signal_time]

        if data.empty:
            return None

        return data

    except Exception as e:
        print("Candle order check error:", e)
        return None


def update_all_running_results():
    """
    Safe TP/SL check-and-balance engine.

    Rules:
    - Checks every ACTIVE signal.
    - Skips symbols without Yahoo mapping instead of crashing.
    - Uses candle order after signal creation when available.
    - Fallback uses latest live price when candles are unavailable.
    - Closes signals when TP/SL is hit.
    - Sends Telegram update when a signal closes.
    """
    if not db_enabled():
        return []

    running_signals = (
        supabase.table("signals")
        .select("*")
        .eq("status", "ACTIVE")
        .execute()
        .data
        or []
    )

    updated_signals = []

    for signal in running_signals:
        try:
            symbol = signal.get("symbol")
            yahoo_symbol = SYMBOLS.get(symbol)

            # Prevent cron-check crash for symbols not supported in SYMBOLS.
            if not yahoo_symbol:
                print("Skipping TP/SL check: missing Yahoo symbol mapping for", symbol)
                updated_signals.append(signal)
                continue

            direction = str(signal.get("direction", "")).upper()
            sl = safe_float(signal.get("sl"))
            tp1 = safe_float(signal.get("tp1"))
            tp2 = safe_float(signal.get("tp2"))
            tp3 = safe_float(signal.get("tp3"))

            if direction not in ["BUY", "SELL", "BUY LIMIT", "SELL LIMIT", "BUY STOP", "SELL STOP"] or sl is None:
                updated_signals.append(signal)
                continue

            direction_base = "BUY" if direction.startswith("BUY") else "SELL"

            targets = [
                ("TP1", tp1),
                ("TP2", tp2),
                ("TP3", tp3),
            ]

            targets = [(name, value) for name, value in targets if value is not None]

            if not targets:
                updated_signals.append(signal)
                continue

            updates = {}
            final_result = None

            def close_signal(result: str):
                now = datetime.now(timezone.utc).isoformat()
                result_updates = {
                    "status": "CLOSED",
                    "result": result,
                    "closed_at": now,
                }

                if result == "SL":
                    result_updates["hit_sl"] = True
                if result in ["TP1", "TP2", "TP3"]:
                    result_updates["hit_tp1"] = True
                if result in ["TP2", "TP3"]:
                    result_updates["hit_tp2"] = True
                if result == "TP3":
                    result_updates["hit_tp3"] = True

                return result_updates

            # First try candle-by-candle history.
            try:
                candles = get_candles_since_signal(yahoo_symbol, signal.get("created_at"))
            except Exception as e:
                print("Candle fetch failed for", symbol, str(e))
                candles = None

            if candles is not None and not candles.empty:
                for _, row in candles.iterrows():
                    try:
                        high = float(row["High"])
                        low = float(row["Low"])
                    except Exception:
                        continue

                    if direction_base == "BUY":
                        if low <= sl:
                            final_result = "SL"
                            updates = close_signal("SL")
                            break

                        hit_target = None
                        for target_name, target_value in reversed(targets):
                            if high >= target_value:
                                hit_target = target_name
                                break

                        if hit_target:
                            final_result = hit_target
                            updates = close_signal(hit_target)
                            break

                    elif direction_base == "SELL":
                        if high >= sl:
                            final_result = "SL"
                            updates = close_signal("SL")
                            break

                        hit_target = None
                        for target_name, target_value in reversed(targets):
                            if low <= target_value:
                                hit_target = target_name
                                break

                        if hit_target:
                            final_result = hit_target
                            updates = close_signal(hit_target)
                            break

            # Fallback live price check.
            if not updates:
                try:
                    current_price, _ = get_live_price(yahoo_symbol)
                except Exception as e:
                    print("Live price fetch failed for", symbol, str(e))
                    current_price = None

                if current_price is not None:
                    if direction_base == "BUY":
                        if current_price <= sl:
                            final_result = "SL"
                            updates = close_signal("SL")
                        else:
                            hit_target = None
                            for target_name, target_value in reversed(targets):
                                if current_price >= target_value:
                                    hit_target = target_name
                                    break
                            if hit_target:
                                final_result = hit_target
                                updates = close_signal(hit_target)

                    elif direction_base == "SELL":
                        if current_price >= sl:
                            final_result = "SL"
                            updates = close_signal("SL")
                        else:
                            hit_target = None
                            for target_name, target_value in reversed(targets):
                                if current_price <= target_value:
                                    hit_target = target_name
                                    break
                            if hit_target:
                                final_result = hit_target
                                updates = close_signal(hit_target)

            if updates:
                try:
                    supabase.table("signals").update(updates).eq("id", signal["id"]).execute()
                    signal.update(updates)

                    try:
                        send_telegram(result_message(signal, final_result))
                    except Exception as e:
                        print("Telegram close update failed:", str(e))

                except Exception as e:
                    print("Signal result update failed:", str(e))

            updated_signals.append(signal)

        except Exception as e:
            print("TP/SL check failed for signal", signal.get("id"), str(e))
            updated_signals.append(signal)
            continue

    return updated_signals


def parse_datetime(value: str):
    if not value:
        return datetime.now(timezone.utc)

    if value.endswith("Z"):
        value = value.replace("Z", "+00:00")

    return datetime.fromisoformat(value)


def performance_for_strategy(strategy_name: str, days: int = 7):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    signals = get_all_signals()

    total = 0
    active = 0
    rejected = 0
    wins = 0
    losses = 0
    tp1 = 0
    tp2 = 0
    tp3 = 0
    sl = 0

    for signal in signals:
        if signal.get("strategy", "Strategy A") != strategy_name:
            continue

        created_at = parse_datetime(signal.get("created_at"))

        if created_at < start:
            continue

        total += 1

        if signal.get("status") == "ACTIVE":
            active += 1

        if signal.get("status") == "REJECTED":
            rejected += 1

        if signal.get("hit_tp1"):
            tp1 += 1

        if signal.get("hit_tp2"):
            tp2 += 1

        if signal.get("hit_tp3"):
            tp3 += 1

        if signal.get("hit_sl") or signal.get("result") == "SL":
            sl += 1

        if signal.get("status") == "CLOSED" and signal.get("result") == "TP3":
            wins += 1

        if signal.get("status") == "CLOSED" and signal.get("result") == "SL":
            losses += 1

    closed = wins + losses
    win_rate = round((wins / closed) * 100, 2) if closed > 0 else 0

    return {
        "totalSignalsLogged": total,
        "activeTrades": active,
        "rejectedSignals": rejected,
        "closedTrades": closed,
        "wins": wins,
        "losses": losses,
        "tp1Hits": tp1,
        "tp2Hits": tp2,
        "tp3Hits": tp3,
        "slHits": sl,
        "winRate": win_rate,
    }


def build_signal_stats():
    update_all_running_results()

    all_signals = get_all_signals()
    active = [s for s in all_signals if s.get("status") == "ACTIVE"]
    closed = [s for s in all_signals if s.get("status") == "CLOSED"]
    rejected = [s for s in all_signals if s.get("status") == "REJECTED"]

    return {
        "totalSignals": len(all_signals),
        "runningSignals": len(active),
        "closedSignals": len(closed),
        "rejectedSignals": len(rejected),
        "strategyA": performance_for_strategy("Strategy A", 7),
        "strategyB": performance_for_strategy("Strategy B", 7),
    }



class SignalUpdate(BaseModel):
    symbol: Optional[str] = None
    direction: Optional[str] = None
    entry: Optional[str] = None
    sl: Optional[str] = None
    tp1: Optional[str] = None
    tp2: Optional[str] = None
    tp3: Optional[str] = None
    status: Optional[str] = None
    result: Optional[str] = None
    note: Optional[str] = None
    analyst: Optional[str] = None


@app.get("/")
def root():
    return {
        "service": "EasyPips Pro Signals API",
        "status": "running",
        "database": "connected" if db_enabled() else "not connected",
        "telegram": "enabled" if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID else "disabled",
        "optimization": {
            "minScore": MIN_SIGNAL_SCORE,
            "maxSignalsPerDay": MAX_SIGNALS_PER_DAY,
            "cooldownMinutes": SIGNAL_COOLDOWN_MINUTES,
        },
        "strategies": ["Strategy A - EMA RSI Momentum", "Strategy B - Fibonacci Pattern"],
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "database": "connected" if db_enabled() else "not connected",
    }


@app.get("/cron-check")
def cron_check():
    a = generate_strategy_a_signals()
    b = generate_strategy_b_signals()
    checked = update_all_running_results()

    return {
        "status": "ok",
        "strategyA": a,
        "strategyB": b,
        "checkedSignals": len(checked),
        "message": "Strategies checked, quality gate applied, TP/SL updated",
    }


@app.get("/system-status")
def system_status():
    signals = get_all_signals()

    return {
        "status": "running",
        "database": "connected" if db_enabled() else "not connected",
        "telegram": "connected" if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID else "not connected",
        "totalSignals": len(signals),
        "activeSignals": len([s for s in signals if s.get("status") == "ACTIVE"]),
        "closedSignals": len([s for s in signals if s.get("status") == "CLOSED"]),
        "rejectedSignals": len([s for s in signals if s.get("status") == "REJECTED"]),
        "strategyAActive": len(get_active_signals(source="AI Engine", strategy="Strategy A")),
        "strategyBActive": len(get_active_signals(source="AI Engine", strategy="Strategy B")),
        "lastSignalTime": signals[0].get("created_at") if signals else None,
        "serverTimeUTC": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/strategy-debug")
def strategy_debug():
    results = []

    for symbol, yahoo_symbol in SYMBOLS.items():
        item = {
            "symbol": symbol,
            "strategyA": {},
            "strategyB": {},
        }

        try:
            data_a = yf.Ticker(yahoo_symbol).history(period="5d", interval="15m")

            if data_a.empty or len(data_a) < 80:
                item["strategyA"] = {"status": "blocked", "reason": "Not enough data"}
            else:
                close = data_a["Close"]
                ema20 = close.ewm(span=20, adjust=False).mean()
                ema50 = close.ewm(span=50, adjust=False).mean()
                rsi = calculate_rsi(close)

                price = float(close.iloc[-1])
                previous = float(close.iloc[-5])
                e20 = float(ema20.iloc[-1])
                e50 = float(ema50.iloc[-1])
                current_rsi = float(rsi.iloc[-1])
                momentum = price - previous

                analysis_a = analyze_strategy_a(symbol, yahoo_symbol)

                if analysis_a:
                    reason = analysis_a.get("note")
                else:
                    reason = "EMA/RSI/Momentum conditions not aligned"

                    if not (price > e50 and e20 > e50) and not (price < e50 and e20 < e50):
                        reason = "Trend not aligned with EMA filters"
                    elif not (30 <= current_rsi <= 70):
                        reason = "RSI outside strategy range"
                    elif abs(momentum) <= 0:
                        reason = "Momentum is flat"

                item["strategyA"] = {
                    "status": "signal" if analysis_a else "blocked",
                    "price": format_price(symbol, price),
                    "ema20": round(e20, 5),
                    "ema50": round(e50, 5),
                    "rsi": round(current_rsi, 2),
                    "momentum": round(momentum, 5),
                    "reason": reason,
                }

        except Exception as e:
            item["strategyA"] = {"status": "error", "reason": str(e)}

        try:
            data_b = yf.Ticker(yahoo_symbol).history(period="15d", interval="15m")

            if data_b.empty or len(data_b) < 220:
                item["strategyB"] = {"status": "blocked", "reason": "Not enough data"}
            else:
                data_b = data_b.dropna().copy()
                data_b["ema50"] = data_b["Close"].ewm(span=50, adjust=False).mean()
                data_b["ema200"] = data_b["Close"].ewm(span=200, adjust=False).mean()
                data_b["atr"] = calculate_atr(data_b)

                latest = data_b.iloc[-1]
                price = float(latest["Close"])
                atr = float(latest["atr"])

                trend = "sideways"
                if price > float(latest["ema50"]) > float(latest["ema200"]):
                    trend = "bullish"
                elif price < float(latest["ema50"]) < float(latest["ema200"]):
                    trend = "bearish"

                swings = detect_swings(data_b)
                swing_low, swing_high = latest_swing_range(swings)

                analysis_b = analyze_strategy_b(symbol, yahoo_symbol)

                reason = "No valid Fibonacci setup"

                if not swing_low or not swing_high:
                    reason = "No valid swing range"
                elif trend == "sideways":
                    reason = "Trend is sideways"
                elif analysis_b:
                    reason = analysis_b.get("note")
                else:
                    low = float(swing_low["price"])
                    high = float(swing_high["price"])

                    if trend == "bullish":
                        levels = fib_levels(low, high, "BUY")
                        fib_name, fib_price, distance, tolerance = nearest_fib_match(price, levels, atr)

                        if not fib_name:
                            reason = "Price not near Fibonacci retracement"
                        elif not bullish_confirmation(data_b):
                            reason = "No bullish confirmation candle"
                        else:
                            reason = "Risk/reward or quality gate blocked"

                    elif trend == "bearish":
                        levels = fib_levels(low, high, "SELL")
                        fib_name, fib_price, distance, tolerance = nearest_fib_match(price, levels, atr)

                        if not fib_name:
                            reason = "Price not near Fibonacci retracement"
                        elif not bearish_confirmation(data_b):
                            reason = "No bearish confirmation candle"
                        else:
                            reason = "Risk/reward or quality gate blocked"

                item["strategyB"] = {
                    "status": "signal" if analysis_b else "blocked",
                    "price": format_price(symbol, price),
                    "trend": trend,
                    "atr": round(atr, 5),
                    "swingLow": swing_low,
                    "swingHigh": swing_high,
                    "reason": reason,
                }

        except Exception as e:
            item["strategyB"] = {"status": "error", "reason": str(e)}

        results.append(item)

    return {
        "status": "ok",
        "message": "Strategy debug completed",
        "results": results,
    }


@app.get("/signal-stats")
def signal_stats():
    return build_signal_stats()


@app.get("/strategy-performance")
def strategy_performance():
    return {
        "Strategy A": performance_for_strategy("Strategy A", 7),
        "Strategy B": performance_for_strategy("Strategy B", 7),
    }


@app.get("/weekly-performance")
def weekly_performance():
    return strategy_performance()


@app.get("/strategy-a-signals")
def strategy_a_signals():
    return {
        "strategy": "Strategy A",
        "signals": get_active_signals(source="AI Engine", strategy="Strategy A"),
    }


@app.get("/strategy-b-signals")
def strategy_b_signals():
    return {
        "strategy": "Strategy B",
        "signals": get_active_signals(source="AI Engine", strategy="Strategy B"),
    }


@app.get("/rejected-signals")
def rejected_signals():
    if not db_enabled():
        return {"signals": []}

    response = (
        supabase.table("signals")
        .select("*")
        .eq("status", "REJECTED")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    return {"signals": response.data or []}


@app.get("/all-paid-signals")
def all_paid_signals():
    update_all_running_results()

    return {
        "aiSignals": get_active_signals(source="AI Engine"),
        "strategyASignals": get_active_signals(source="AI Engine", strategy="Strategy A"),
        "strategyBSignals": get_active_signals(source="AI Engine", strategy="Strategy B"),
        "desk1Signals": get_active_signals(source="Human Desk", desk="Desk 1"),
        "desk2Signals": get_active_signals(source="Human Desk", desk="Desk 2"),
    }


@app.get("/closed-signals")
def closed_signals():
    if not db_enabled():
        return {"closedSignals": []}

    update_all_running_results()

    response = (
        supabase.table("signals")
        .select("*")
        .eq("status", "CLOSED")
        .order("closed_at", desc=True)
        .execute()
    )

    return {"closedSignals": response.data or []}


@app.get("/telegram-test")
def telegram_test():
    send_telegram("🚀 *EasyPips Telegram connected successfully!*")
    return {"status": "ok", "message": "Telegram test sent"}


@app.get("/chart-test")
def chart_test():
    test_signal = {
        "source": "AI Engine",
        "strategy": "Strategy B",
        "pattern": "bullish_fib_pullback",
        "symbol": "EUR/USD",
        "direction": "BUY",
        "entry": "1.10000",
        "sl": "1.09000",
        "tp1": "1.11000",
        "tp2": "1.12000",
        "tp3": "1.13000",
        "status": "ACTIVE",
        "result": "RUNNING",
        "confidence": 88,
        "score": 88,
    }

    send_new_signal_with_chart(test_signal)

    return {"status": "ok", "message": "Chart test sent"}


@app.post("/admin/login")
def admin_login(data: AdminLogin):
    if data.username == ADMIN_USERNAME and data.password == ADMIN_PASSWORD:
        return {
            "success": True,
            "access_token": create_admin_token(),
            "token_type": "bearer",
        }

    raise HTTPException(status_code=401, detail="Invalid admin credentials")


@app.get("/admin/me")
def admin_me(authorization: str = Header(default="")):
    payload = verify_admin_token(authorization)
    return {"success": True, "admin": payload.get("sub")}


@app.get("/live-prices")
def live_prices():
    prices = {}

    for symbol, yahoo_symbol in SYMBOLS.items():
        price, _ = get_live_price(yahoo_symbol)
        prices[symbol] = format_price(symbol, price) if price else None

    return prices


@app.post("/update-results")
def update_results(authorization: str = Header(default="")):
    verify_admin_token(authorization)
    updated = update_all_running_results()
    return {"success": True, "checkedSignals": len(updated)}


@app.post("/desk1/signals")
def create_desk1_signal(signal: ManualSignal, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    new_signal = {
        "source": "Human Desk",
        "desk": "Desk 1",
        "strategy": "Manual Desk",
        "pattern": "manual_signal",
        "timeframe": "manual",
        "symbol": signal.symbol,
        "direction": signal.direction.upper(),
        "entry": str(signal.entry),
        "sl": str(signal.sl),
        "tp1": str(signal.tp1),
        "tp2": str(signal.tp2),
        "tp3": str(signal.tp3),
        "confidence": None,
        "score": None,
        "analyst": signal.analyst,
        "note": signal.note,
        "status": "ACTIVE",
        "result": "RUNNING",
        "hit_tp1": False,
        "hit_tp2": False,
        "hit_tp3": False,
        "hit_sl": False,
        "telegram_sent": False,
    }

    saved = insert_signal(new_signal, send_alert=False)

    if not saved.get("telegram_sent"):
        try:
            ok = send_telegram(new_signal_message(saved))
            if ok and db_enabled() and saved.get("id"):
                supabase.table("signals").update({"telegram_sent": True}).eq("id", saved.get("id")).execute()
                saved["telegram_sent"] = True
        except Exception as e:
            print("Telegram send failed Desk 1:", str(e))

    return {"success": True, "signal": saved}

@app.post("/desk2/signals")
def create_desk2_signal(signal: ManualSignal, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    new_signal = {
        "source": "Human Desk",
        "desk": "Desk 2",
        "strategy": "Manual Desk",
        "pattern": "manual_signal",
        "timeframe": "manual",
        "symbol": signal.symbol,
        "direction": signal.direction.upper(),
        "entry": str(signal.entry),
        "sl": str(signal.sl),
        "tp1": str(signal.tp1),
        "tp2": str(signal.tp2),
        "tp3": str(signal.tp3),
        "confidence": None,
        "score": None,
        "analyst": signal.analyst,
        "note": signal.note,
        "status": "ACTIVE",
        "result": "RUNNING",
        "hit_tp1": False,
        "hit_tp2": False,
        "hit_tp3": False,
        "hit_sl": False,
        "telegram_sent": False,
    }

    saved = insert_signal(new_signal, send_alert=False)

    if not saved.get("telegram_sent"):
        try:
            ok = send_telegram(new_signal_message(saved))
            if ok and db_enabled() and saved.get("id"):
                supabase.table("signals").update({"telegram_sent": True}).eq("id", saved.get("id")).execute()
                saved["telegram_sent"] = True
        except Exception as e:
            print("Telegram send failed Desk 2:", str(e))

    return {"success": True, "signal": saved}

@app.get("/admin/signals")
def admin_list_signals(authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"signals": []}

    rows = (
        supabase.table("signals")
        .select("*")
        .neq("status", "DELETED")
        .order("created_at", desc=True)
        .limit(100)
        .execute()
        .data
        or []
    )

    return {"signals": rows}


@app.patch("/admin/signals/{signal_id}")
def admin_update_signal(signal_id: str, data: SignalUpdate, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    updates = {k: v for k, v in data.dict().items() if v is not None}

    if "direction" in updates:
        updates["direction"] = str(updates["direction"]).upper()

    if not updates:
        return {"success": False, "message": "No fields to update"}

    response = (
        supabase.table("signals")
        .update(updates)
        .eq("id", signal_id)
        .execute()
    )

    updated = response.data[0] if response.data else None

    return {"success": True, "signal": updated}


@app.delete("/admin/signals/{signal_id}")
def admin_delete_signal(signal_id: str, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    response = (
        supabase.table("signals")
        .update({"status": "DELETED", "result": "DELETED"})
        .eq("id", signal_id)
        .execute()
    )

    deleted = response.data[0] if response.data else None

    return {"success": True, "signal": deleted}

@app.delete("/signals/{signal_id}")
def delete_signal(signal_id: str, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    supabase.table("signals").update({"status": "DELETED"}).eq("id", signal_id).execute()

    return {"success": True}



@app.get("/news-calendar")
def news_calendar():
    """
    Real economic calendar from Financial Modeling Prep.
    Requires FMP_API_KEY in Render environment.
    Falls back to safe demo events if FMP is unavailable.
    """
    fmp_key = os.getenv("FMP_API_KEY")

    fallback_events = [
        {"time": "12:30", "currency": "USD", "event": "Non-Farm Payrolls", "impact": "High"},
        {"time": "14:00", "currency": "USD", "event": "ISM Manufacturing PMI", "impact": "High"},
        {"time": "09:00", "currency": "EUR", "event": "ECB Speech", "impact": "Medium"},
        {"time": "08:30", "currency": "GBP", "event": "GDP Monthly", "impact": "Medium"},
    ]

    if not fmp_key:
        return {
            "status": "fallback",
            "source": "demo",
            "message": "FMP_API_KEY not set",
            "events": fallback_events,
        }

    try:
        today = datetime.now(timezone.utc).date()
        from_date = today.isoformat()
        to_date = (today + timedelta(days=7)).isoformat()

        url = "https://financialmodelingprep.com/api/v3/economic_calendar"
        params = {
            "from": from_date,
            "to": to_date,
            "apikey": fmp_key,
        }

        response = requests.get(url, params=params, timeout=15)

        if response.status_code != 200:
            print("FMP news failed:", response.status_code, response.text)
            return {
                "status": "fallback",
                "source": "demo",
                "message": "FMP request failed",
                "events": fallback_events,
            }

        raw_events = response.json()

        important_currencies = {"USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY"}

        events = []

        for item in raw_events[:100]:
            currency = item.get("currency") or item.get("country") or ""
            event_name = item.get("event") or item.get("title") or item.get("name") or "Economic Event"
            impact = item.get("impact") or item.get("importance") or "Medium"
            date_value = item.get("date") or item.get("datetime") or ""

            if currency and currency not in important_currencies:
                continue

            impact_text = str(impact).capitalize()
            if impact_text not in ["High", "Medium", "Low"]:
                impact_text = "Medium"

            display_time = "TBA"
            display_date = ""

            try:
                if date_value:
                    dt = datetime.fromisoformat(str(date_value).replace("Z", "+00:00"))
                    display_time = dt.strftime("%H:%M")
                    display_date = dt.date().isoformat()
            except Exception:
                display_time = str(date_value)[11:16] if len(str(date_value)) >= 16 else "TBA"

            events.append({
                "time": display_time,
                "date": display_date,
                "currency": currency or "-",
                "event": event_name,
                "impact": impact_text,
            })

        if not events:
            return {
                "status": "fallback",
                "source": "demo",
                "message": "No FMP events returned",
                "events": fallback_events,
            }

        return {
            "status": "ok",
            "source": "financialmodelingprep",
            "events": events[:20],
        }

    except Exception as e:
        print("News calendar exception:", str(e))
        return {
            "status": "fallback",
            "source": "demo",
            "message": str(e),
            "events": fallback_events,
        }

@app.get("/client-accounts")
def client_accounts():
    if not db_enabled():
        return {"accounts": []}

    response = (
        supabase.table("client_accounts")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    return {"accounts": response.data or []}


@app.post("/client-accounts/connect")
def request_account_connection(account: ClientAccountRequest):
    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    payload = {
        "name": account.name,
        "platform": account.platform.upper(),
        "broker": account.broker,
        "account_login": account.account_login,
        "status": "pending",
        "risk_mode": account.risk_mode,
        "max_lot": account.max_lot,
        "auto_trade_enabled": False,
        "consent": bool(account.consent),
        "kill_switch": False,
    }

    response = supabase.table("client_accounts").insert(payload).execute()

    if response.data:
        log_action(response.data[0]["id"], "ACCOUNT_REQUESTED", {
            "name": account.name,
            "platform": account.platform.upper(),
            "broker": account.broker,
            "risk_mode": account.risk_mode,
            "max_lot": account.max_lot,
            "consent": bool(account.consent),
        })

    send_telegram(f"""
🧾 *NEW ACCOUNT CONNECTION REQUEST*

Name: {account.name}
Platform: {account.platform.upper()}
Broker: {account.broker}
Login: {account.account_login}
Risk Mode: {account.risk_mode}
Max Lot: {account.max_lot}
""")

    return {
        "success": True,
        "message": "Connection request received",
        "account": response.data[0] if response.data else payload,
    }


@app.post("/client-accounts/{account_id}/toggle-auto-trade")
def toggle_auto_trade(account_id: str, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    current = (
        supabase.table("client_accounts")
        .select("*")
        .eq("id", account_id)
        .execute()
        .data
        or []
    )

    if not current:
        raise HTTPException(status_code=404, detail="Account not found")

    account = current[0]
    new_value = not bool(account.get("auto_trade_enabled"))

    response = (
        supabase.table("client_accounts")
        .update({"auto_trade_enabled": new_value})
        .eq("id", account_id)
        .execute()
    )

    return {
        "success": True,
        "auto_trade_enabled": new_value,
        "account": response.data[0] if response.data else None,
    }


@app.get("/desk-performance")
def desk_performance():
    signals = get_all_signals()

    def calc(desk_name: str):
        rows = [s for s in signals if s.get("desk") == desk_name]

        total = len(rows)
        active = len([s for s in rows if s.get("status") == "ACTIVE"])
        closed = [s for s in rows if s.get("status") == "CLOSED"]

        tp = len([s for s in closed if s.get("result") == "TP3"])
        sl = len([s for s in closed if s.get("result") == "SL"])

        closed_count = tp + sl
        win_rate = round((tp / closed_count) * 100, 2) if closed_count else 0

        return {
            "totalSignals": total,
            "activeTrades": active,
            "closedTrades": closed_count,
            "tpHits": tp,
            "slHits": sl,
            "winRate": win_rate,
        }

    return {
        "Desk 1": calc("Desk 1"),
        "Desk 2": calc("Desk 2"),
    }


@app.get("/admin/client-accounts")
def admin_client_accounts(authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"accounts": []}

    response = (
        supabase.table("client_accounts")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    return {"accounts": response.data or []}


@app.post("/admin/client-accounts/{account_id}/approve")
def approve_client_account(account_id: str, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    response = (
        supabase.table("client_accounts")
        .update({"status": "approved"})
        .eq("id", account_id)
        .execute()
    )

    account = response.data[0] if response.data else None

    if account:
        send_telegram(f"""
✅ *ACCOUNT APPROVED*

Name: {account.get("name")}
Platform: {account.get("platform")}
Broker: {account.get("broker")}
Login: {account.get("account_login")}
Auto Trade: {account.get("auto_trade_enabled")}
Max Lot: {account.get("max_lot")}
""")

    log_action(account_id, "ACCOUNT_APPROVED", {
        "name": account.get("name") if account else None,
        "platform": account.get("platform") if account else None,
    })

    return {
        "success": True,
        "message": "Account approved",
        "account": account,
    }


@app.post("/admin/client-accounts/{account_id}/reject")
def reject_client_account(account_id: str, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    response = (
        supabase.table("client_accounts")
        .update({"status": "rejected", "auto_trade_enabled": False})
        .eq("id", account_id)
        .execute()
    )

    account = response.data[0] if response.data else None

    if account:
        send_telegram(f"""
❌ *ACCOUNT REJECTED*

Name: {account.get("name")}
Platform: {account.get("platform")}
Broker: {account.get("broker")}
Login: {account.get("account_login")}
""")

    log_action(account_id, "ACCOUNT_REJECTED", {
        "name": account.get("name") if account else None,
        "platform": account.get("platform") if account else None,
    })

    return {
        "success": True,
        "message": "Account rejected",
        "account": account,
    }


@app.patch("/admin/client-accounts/{account_id}/update-risk")
def update_client_account_risk(
    account_id: str,
    data: AdminAccountUpdate,
    authorization: str = Header(default=""),
):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    updates = {}

    if data.risk_mode is not None:
        updates["risk_mode"] = data.risk_mode

    if data.max_lot is not None:
        updates["max_lot"] = data.max_lot

    if data.status is not None:
        updates["status"] = data.status

    if not updates:
        return {"success": False, "message": "No updates provided"}

    response = (
        supabase.table("client_accounts")
        .update(updates)
        .eq("id", account_id)
        .execute()
    )

    log_action(account_id, "RISK_UPDATED", updates)

    return {
        "success": True,
        "message": "Account risk settings updated",
        "account": response.data[0] if response.data else None,
    }


@app.post("/admin/client-accounts/{account_id}/toggle-auto-trade")
def admin_toggle_auto_trade(account_id: str, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    current = (
        supabase.table("client_accounts")
        .select("*")
        .eq("id", account_id)
        .execute()
        .data
        or []
    )

    if not current:
        raise HTTPException(status_code=404, detail="Account not found")

    account = current[0]

    if account.get("status") != "approved":
        return {
            "success": False,
            "message": "Account must be approved before enabling auto trading",
            "account": account,
        }

    if not bool(account.get("consent")):
        return {
            "success": False,
            "message": "Client consent required before enabling auto trading",
            "account": account,
        }

    if bool(account.get("kill_switch")):
        return {
            "success": False,
            "message": "Kill switch is ON. Disable kill switch before enabling auto trading",
            "account": account,
        }

    new_value = not bool(account.get("auto_trade_enabled"))

    response = (
        supabase.table("client_accounts")
        .update({"auto_trade_enabled": new_value})
        .eq("id", account_id)
        .execute()
    )

    updated = response.data[0] if response.data else None

    send_telegram(f"""
⚙️ *AUTO TRADE UPDATED*

Name: {account.get("name")}
Platform: {account.get("platform")}
Login: {account.get("account_login")}
Auto Trade: {"ON" if new_value else "OFF"}
""")

    log_action(account_id, "AUTO_TRADE_TOGGLED", {
        "auto_trade_enabled": new_value,
    })

    return {
        "success": True,
        "auto_trade_enabled": new_value,
        "account": updated,
    }


@app.post("/admin/client-accounts/{account_id}/toggle-kill-switch")
def toggle_kill_switch(account_id: str, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    current = (
        supabase.table("client_accounts")
        .select("*")
        .eq("id", account_id)
        .execute()
        .data
        or []
    )

    if not current:
        raise HTTPException(status_code=404, detail="Account not found")

    account = current[0]
    new_value = not bool(account.get("kill_switch"))

    updates = {"kill_switch": new_value}

    # Safety rule:
    # If kill switch is turned ON, auto trading must turn OFF immediately.
    if new_value:
        updates["auto_trade_enabled"] = False

    response = (
        supabase.table("client_accounts")
        .update(updates)
        .eq("id", account_id)
        .execute()
    )

    updated = response.data[0] if response.data else None

    log_action(account_id, "KILL_SWITCH_TOGGLED", {
        "kill_switch": new_value,
        "auto_trade_enabled": updated.get("auto_trade_enabled") if updated else None,
    })

    send_telegram(f"""
🛑 *KILL SWITCH UPDATED*

Name: {account.get("name")}
Platform: {account.get("platform")}
Login: {account.get("account_login")}
Kill Switch: {"ON" if new_value else "OFF"}
Auto Trade: {"OFF" if new_value else account.get("auto_trade_enabled")}
""")

    return {
        "success": True,
        "kill_switch": new_value,
        "account": updated,
    }


@app.get("/admin/audit-logs")
def admin_audit_logs(authorization: str = Header(default=""), limit: int = 100):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"logs": []}

    response = (
        supabase.table("audit_logs")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    return {"logs": response.data or []}


@app.get("/admin/client-accounts/{account_id}/audit-logs")
def account_audit_logs(account_id: str, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"logs": []}

    response = (
        supabase.table("audit_logs")
        .select("*")
        .eq("account_id", account_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )

    return {"logs": response.data or []}


@app.post("/client/register")
def client_register(data: ClientRegisterRequest):
    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    existing = (
        supabase.table("client_users")
        .select("*")
        .eq("email", data.email.lower())
        .execute()
        .data
        or []
    )

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    payload = {
        "email": data.email.lower(),
        "password": hash_password(data.password),
        "name": data.name,
        "account_id": data.account_id,
    }

    response = supabase.table("client_users").insert(payload).execute()

    user = response.data[0] if response.data else payload
    token = create_client_token(user)

    log_action(str(data.account_id or ""), "CLIENT_REGISTERED", {
        "email": data.email.lower(),
        "name": data.name,
        "account_id": data.account_id,
    })

    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "client": {
            "id": user.get("id"),
            "email": user.get("email"),
            "name": user.get("name"),
            "account_id": user.get("account_id"),
        },
    }


@app.post("/client/login")
def client_login(data: ClientLoginRequest):
    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    rows = (
        supabase.table("client_users")
        .select("*")
        .eq("email", data.email.lower())
        .execute()
        .data
        or []
    )

    if not rows:
        raise HTTPException(status_code=401, detail="Invalid client credentials")

    user = rows[0]

    if user.get("password") != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid client credentials")

    token = create_client_token(user)

    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "client": {
            "id": user.get("id"),
            "email": user.get("email"),
            "name": user.get("name"),
            "account_id": user.get("account_id"),
        },
    }


@app.get("/client/me")
def client_me(authorization: str = Header(default="")):
    payload = verify_client_token(authorization)

    user = get_client_user_by_id(payload.get("client_id"))

    if not user:
        raise HTTPException(status_code=404, detail="Client not found")

    return {
        "success": True,
        "client": {
            "id": user.get("id"),
            "email": user.get("email"),
            "name": user.get("name"),
            "account_id": user.get("account_id"),
        },
    }


@app.get("/client/dashboard")
def client_dashboard(authorization: str = Header(default="")):
    payload = verify_client_token(authorization)
    account_id = payload.get("account_id")

    if not account_id:
        return {
            "success": True,
            "account": None,
            "trades": [],
            "equity": calculate_equity_summary([]),
        }

    account_rows = (
        supabase.table("client_accounts")
        .select("*")
        .eq("id", account_id)
        .execute()
        .data
        or []
    )

    account = account_rows[0] if account_rows else None

    trades = (
        supabase.table("trade_history")
        .select("*")
        .eq("account_id", account_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )

    return {
        "success": True,
        "account": account,
        "trades": trades,
        "equity": calculate_equity_summary(trades),
    }


@app.get("/client/equity-curve")
def client_equity_curve(authorization: str = Header(default="")):
    payload = verify_client_token(authorization)
    account_id = payload.get("account_id")

    if not account_id:
        return {"success": True, "equity": calculate_equity_summary([])}

    trades = (
        supabase.table("trade_history")
        .select("*")
        .eq("account_id", account_id)
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )

    return {
        "success": True,
        "equity": calculate_equity_summary(trades),
    }


@app.post("/admin/trade-history")
def admin_add_trade_history(
    data: TradeHistoryRequest,
    authorization: str = Header(default=""),
):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    payload = {
        "account_id": data.account_id,
        "signal_id": data.signal_id,
        "symbol": data.symbol,
        "direction": data.direction.upper(),
        "entry": data.entry,
        "sl": data.sl,
        "tp": data.tp,
        "result": data.result,
        "profit_loss": data.profit_loss,
        "balance_after": data.balance_after,
        "closed_at": data.closed_at,
    }

    response = supabase.table("trade_history").insert(payload).execute()

    log_action(data.account_id, "TRADE_HISTORY_ADDED", payload)

    return {
        "success": True,
        "trade": response.data[0] if response.data else payload,
    }


@app.get("/admin/trade-history/{account_id}")
def admin_get_trade_history(account_id: str, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"trades": [], "equity": calculate_equity_summary([])}

    trades = (
        supabase.table("trade_history")
        .select("*")
        .eq("account_id", account_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )

    return {
        "trades": trades,
        "equity": calculate_equity_summary(trades),
    }



@app.get("/admin/telegram-health")
def admin_telegram_health(authorization: str = Header(default="")):
    verify_admin_token(authorization)
    ok = send_telegram("✅ *EasyPips Telegram health check*\\n\\nTelegram is connected and Markdown formatting is working.")
    return {"success": ok}

@app.get("/debug-telegram")
def debug_telegram():
    ok = send_telegram("EasyPips Telegram test message. Telegram connection is working.")
    return {
        "success": ok,
        "message": "Telegram test attempted. Check Telegram and Render logs.",
    }


@app.post("/admin/broadcast-signal-test")
def admin_broadcast_signal_test(authorization: str = Header(default="")):
    verify_admin_token(authorization)

    message = """EASY PIPS TEST SIGNAL

Symbol: BTC/USD
Direction: BUY
Entry: Test
SL: Test
TP: Test

Manual broadcast test from admin endpoint."""

    ok = send_telegram(message)

    return {
        "success": ok,
        "message": "Manual Telegram signal broadcast attempted.",
    }

@app.post("/admin/reset-ai-signals")
def reset_ai_signals(authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    supabase.table("signals").update({"status": "DELETED"}).eq("source", "AI Engine").execute()

    return {"success": True, "message": "AI signals reset"}
