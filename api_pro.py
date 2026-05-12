from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from jose import jwt, JWTError
import os
import math
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
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24
MAX_AI_SIGNALS_PER_STRATEGY = 6

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


def db_enabled():
    return supabase is not None


def send_telegram(message: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return

    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": message,
                "parse_mode": "Markdown",
                "disable_web_page_preview": True,
            },
            timeout=10,
        )
    except Exception as e:
        print("Telegram error:", e)


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
    strategy = signal.get("strategy", "Strategy A")
    pattern = signal.get("pattern") or "standard_setup"

    return f"""
🚀 *EASY PIPS VIP SIGNAL*

━━━━━━━━━━━━━━━

📊 *Pair:* {signal.get("symbol")}
📈 *Direction:* {signal.get("direction")}
🧠 *Strategy:* {strategy}
📌 *Pattern:* {pattern}

━━━━━━━━━━━━━━━

🎯 *ENTRY:* `{signal.get("entry")}`
🛑 *STOP LOSS:* `{signal.get("sl")}`

💰 *TP1:* `{signal.get("tp1")}`
💰 *TP2:* `{signal.get("tp2")}`
💰 *TP3:* `{signal.get("tp3")}`

━━━━━━━━━━━━━━━

📊 Confidence: *{signal.get("confidence", "N/A")}%*
⚠️ Demo version. Not financial advice.
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
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def calculate_atr(data, period=14):
    high_low = data["High"] - data["Low"]
    high_close = (data["High"] - data["Close"].shift()).abs()
    low_close = (data["Low"] - data["Close"].shift()).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    return tr.rolling(period).mean()


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

        if price > e50 and e20 > e50 and 52 <= current_rsi <= 70 and momentum > 0:
            return {
                "strategy": "Strategy A",
                "pattern": "ema_rsi_momentum_buy",
                "direction": "BUY",
                "price": price,
                "confidence": min(95, int(80 + (current_rsi - 50))),
                "note": f"EMA20 above EMA50, RSI {round(current_rsi, 2)}, bullish momentum.",
            }

        if price < e50 and e20 < e50 and 30 <= current_rsi <= 48 and momentum < 0:
            return {
                "strategy": "Strategy A",
                "pattern": "ema_rsi_momentum_sell",
                "direction": "SELL",
                "price": price,
                "confidence": min(95, int(80 + (50 - current_rsi))),
                "note": f"EMA20 below EMA50, RSI {round(current_rsi, 2)}, bearish momentum.",
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

    retracements = {
        "0.236": 0.236,
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

    levels = {}

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
    bullish_engulf = last["Close"] > prev["Open"] and last["Open"] < prev["Close"]
    close_above_mid = last["Close"] > (last["High"] + last["Low"]) / 2
    return bool(bullish_close and (bullish_engulf or close_above_mid))


def bearish_confirmation(data):
    last = data.iloc[-1]
    prev = data.iloc[-2]
    bearish_close = last["Close"] < last["Open"]
    bearish_engulf = last["Close"] < prev["Open"] and last["Open"] > prev["Close"]
    close_below_mid = last["Close"] < (last["High"] + last["Low"]) / 2
    return bool(bearish_close and (bearish_engulf or close_below_mid))


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
        if data.empty or len(data) < 250:
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
    pattern = analysis.get("pattern")
    confidence = analysis.get("confidence", 80)

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
        "pattern": pattern,
        "timeframe": "15m",
        "symbol": symbol,
        "direction": direction,
        "entry": format_price(symbol, price),
        "sl": format_price(symbol, sl),
        "tp1": format_price(symbol, tp1),
        "tp2": format_price(symbol, tp2),
        "tp3": format_price(symbol, tp3),
        "confidence": confidence,
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


def active_strategy_signal_exists(symbol: str, strategy: str):
    active = get_active_signals(source="AI Engine", strategy=strategy)
    return any(s.get("symbol") == symbol for s in active)


def send_new_signal_with_chart(saved: dict):
    chart = create_chart(saved.get("symbol"), SYMBOLS.get(saved.get("symbol")))

    if chart:
        send_telegram_image(new_signal_message(saved), chart)
    else:
        send_telegram(new_signal_message(saved))


def insert_signal(signal: dict):
    if not db_enabled():
        return signal

    response = supabase.table("signals").insert(signal).execute()

    if response.data:
        saved = response.data[0]
        send_new_signal_with_chart(saved)
        return saved

    return signal


def generate_strategy_a_signals():
    created = 0

    for symbol, yahoo_symbol in SYMBOLS.items():
        if active_strategy_signal_exists(symbol, "Strategy A"):
            continue

        active_a = get_active_signals(source="AI Engine", strategy="Strategy A")
        if len(active_a) >= MAX_AI_SIGNALS_PER_STRATEGY:
            break

        analysis = analyze_strategy_a(symbol, yahoo_symbol)
        if not analysis:
            continue

        insert_signal(build_ai_signal(symbol, analysis))
        created += 1

    return created


def generate_strategy_b_signals():
    created = 0

    for symbol, yahoo_symbol in SYMBOLS.items():
        if active_strategy_signal_exists(symbol, "Strategy B"):
            continue

        active_b = get_active_signals(source="AI Engine", strategy="Strategy B")
        if len(active_b) >= MAX_AI_SIGNALS_PER_STRATEGY:
            break

        analysis = analyze_strategy_b(symbol, yahoo_symbol)
        if not analysis:
            continue

        insert_signal(build_ai_signal(symbol, analysis))
        created += 1

    return created


def safe_float(value):
    try:
        return float(value)
    except Exception:
        return None


def update_all_running_results():
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
        symbol = signal.get("symbol")
        yahoo_symbol = SYMBOLS.get(symbol)

        if not yahoo_symbol:
            updated_signals.append(signal)
            continue

        price, _ = get_live_price(yahoo_symbol)

        if price is None:
            updated_signals.append(signal)
            continue

        direction = str(signal.get("direction", "")).upper()

        sl = safe_float(signal.get("sl"))
        tp1 = safe_float(signal.get("tp1"))
        tp2 = safe_float(signal.get("tp2"))
        tp3 = safe_float(signal.get("tp3"))

        if sl is None or tp1 is None or tp2 is None or tp3 is None:
            updated_signals.append(signal)
            continue

        updates = {}

        if direction == "BUY":
            if price >= tp1 and not signal.get("hit_tp1"):
                updates["hit_tp1"] = True
                updates["result"] = "TP1"

            if price >= tp2 and not signal.get("hit_tp2"):
                updates["hit_tp2"] = True
                updates["result"] = "TP2"

            if price >= tp3 and not signal.get("hit_tp3"):
                updates["hit_tp3"] = True
                updates["result"] = "TP3"
                updates["status"] = "CLOSED"
                updates["closed_at"] = datetime.now(timezone.utc).isoformat()

            if price <= sl and not signal.get("hit_sl"):
                updates["hit_sl"] = True
                updates["result"] = "SL"
                updates["status"] = "CLOSED"
                updates["closed_at"] = datetime.now(timezone.utc).isoformat()

        elif direction == "SELL":
            if price <= tp1 and not signal.get("hit_tp1"):
                updates["hit_tp1"] = True
                updates["result"] = "TP1"

            if price <= tp2 and not signal.get("hit_tp2"):
                updates["hit_tp2"] = True
                updates["result"] = "TP2"

            if price <= tp3 and not signal.get("hit_tp3"):
                updates["hit_tp3"] = True
                updates["result"] = "TP3"
                updates["status"] = "CLOSED"
                updates["closed_at"] = datetime.now(timezone.utc).isoformat()

            if price >= sl and not signal.get("hit_sl"):
                updates["hit_sl"] = True
                updates["result"] = "SL"
                updates["status"] = "CLOSED"
                updates["closed_at"] = datetime.now(timezone.utc).isoformat()

        if updates:
            supabase.table("signals").update(updates).eq("id", signal["id"]).execute()
            signal.update(updates)

            if updates.get("hit_tp3"):
                send_telegram(result_message(signal, "TP3"))
            elif updates.get("hit_tp2"):
                send_telegram(result_message(signal, "TP2"))
            elif updates.get("hit_tp1"):
                send_telegram(result_message(signal, "TP1"))
            elif updates.get("hit_sl"):
                send_telegram(result_message(signal, "SL"))

        updated_signals.append(signal)

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
    running = 0
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
            running += 1

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
        "totalSignals": total,
        "runningTrades": running,
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

    return {
        "totalSignals": len(all_signals),
        "runningSignals": len(active),
        "closedSignals": len(closed),
        "strategyA": performance_for_strategy("Strategy A", 7),
        "strategyB": performance_for_strategy("Strategy B", 7),
    }


@app.get("/")
def root():
    return {
        "service": "EasyPips Pro Signals API",
        "status": "running",
        "database": "connected" if db_enabled() else "not connected",
        "telegram": "enabled" if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID else "disabled",
        "strategies": ["Strategy A - EMA RSI Momentum", "Strategy B - Fibonacci Pattern"],
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "database": "connected" if db_enabled() else "not connected",
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
        "strategyAActive": len(get_active_signals(source="AI Engine", strategy="Strategy A")),
        "strategyBActive": len(get_active_signals(source="AI Engine", strategy="Strategy B")),
        "lastSignalTime": signals[0].get("created_at") if signals else None,
        "serverTimeUTC": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/cron-check")
def cron_check():
    a_created = generate_strategy_a_signals()
    b_created = generate_strategy_b_signals()
    checked = update_all_running_results()

    return {
        "status": "ok",
        "strategyA_newSignals": a_created,
        "strategyB_newSignals": b_created,
        "checkedSignals": len(checked),
        "message": "Both strategies checked and TP/SL updated",
    }


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
    }

    send_new_signal_with_chart(test_signal)
    return {"status": "ok", "message": "Chart test sent"}


@app.get("/live-prices")
def live_prices():
    prices = {}

    for symbol, yahoo_symbol in SYMBOLS.items():
        price, _ = get_live_price(yahoo_symbol)
        prices[symbol] = format_price(symbol, price) if price else None

    return prices


@app.get("/signal-stats")
def signal_stats():
    return build_signal_stats()


@app.get("/weekly-performance")
def weekly_performance():
    update_all_running_results()
    return {
        "Strategy A": performance_for_strategy("Strategy A", 7),
        "Strategy B": performance_for_strategy("Strategy B", 7),
    }


@app.get("/strategy-performance")
def strategy_performance():
    update_all_running_results()
    return {
        "Strategy A": performance_for_strategy("Strategy A", 7),
        "Strategy B": performance_for_strategy("Strategy B", 7),
    }


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
        "analyst": signal.analyst,
        "note": signal.note,
        "status": "ACTIVE",
        "result": "RUNNING",
        "hit_tp1": False,
        "hit_tp2": False,
        "hit_tp3": False,
        "hit_sl": False,
    }

    saved = insert_signal(new_signal)
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
        "analyst": signal.analyst,
        "note": signal.note,
        "status": "ACTIVE",
        "result": "RUNNING",
        "hit_tp1": False,
        "hit_tp2": False,
        "hit_tp3": False,
        "hit_sl": False,
    }

    saved = insert_signal(new_signal)
    return {"success": True, "signal": saved}


@app.delete("/signals/{signal_id}")
def delete_signal(signal_id: str, authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    supabase.table("signals").update({"status": "DELETED"}).eq("id", signal_id).execute()

    return {"success": True}


@app.post("/admin/reset-ai-signals")
def reset_ai_signals(authorization: str = Header(default="")):
    verify_admin_token(authorization)

    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    supabase.table("signals").update({"status": "DELETED"}).eq("source", "AI Engine").execute()

    return {"success": True, "message": "AI signals reset"}