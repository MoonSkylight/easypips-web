from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone
import os
import requests
import pandas as pd
import yfinance as yf

try:
    import MetaTrader5 as mt5
except Exception:
    mt5 = None

from engine import EasyPipsEngine

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://easypips-web.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MT5_LOGIN = os.getenv("MT5_LOGIN", "")
MT5_PASSWORD = os.getenv("MT5_PASSWORD", "")
MT5_SERVER = os.getenv("MT5_SERVER", "")
TWELVE_DATA_API_KEY = os.getenv("TWELVE_DATA_API_KEY", "")

SYMBOLS = {
    "XAUUSD": {"mt5": "XAUUSD", "twelve": "XAU/USD", "yahoo": "XAUUSD=X"},
    "OIL": {"mt5": "USOIL", "twelve": "USOIL", "yahoo": "CL=F"},
    "SP500": {"mt5": "US500", "twelve": "SPX", "yahoo": "^GSPC"},
    "NASDAQ": {"mt5": "USTEC", "twelve": "IXIC", "yahoo": "^IXIC"},
    "EURUSD": {"mt5": "EURUSD", "twelve": "EUR/USD", "yahoo": "EURUSD=X"},
    "GBPUSD": {"mt5": "GBPUSD", "twelve": "GBP/USD", "yahoo": "GBPUSD=X"},
    "USDJPY": {"mt5": "USDJPY", "twelve": "USD/JPY", "yahoo": "JPY=X"},
    "USDCHF": {"mt5": "USDCHF", "twelve": "USD/CHF", "yahoo": "CHF=X"},
    "USDCAD": {"mt5": "USDCAD", "twelve": "USD/CAD", "yahoo": "CAD=X"},
    "AUDUSD": {"mt5": "AUDUSD", "twelve": "AUD/USD", "yahoo": "AUDUSD=X"},
    "NZDUSD": {"mt5": "NZDUSD", "twelve": "NZD/USD", "yahoo": "NZDUSD=X"},
    "EURJPY": {"mt5": "EURJPY", "twelve": "EUR/JPY", "yahoo": "EURJPY=X"},
    "GBPJPY": {"mt5": "GBPJPY", "twelve": "GBP/JPY", "yahoo": "GBPJPY=X"},
    "EURGBP": {"mt5": "EURGBP", "twelve": "EUR/GBP", "yahoo": "EURGBP=X"},
    "AUDJPY": {"mt5": "AUDJPY", "twelve": "AUD/JPY", "yahoo": "AUDJPY=X"},
    "EURAUD": {"mt5": "EURAUD", "twelve": "EUR/AUD", "yahoo": "EURAUD=X"},
}

TIMEFRAME_TO_MT5 = {
    "1m": getattr(mt5, "TIMEFRAME_M1", None),
    "5m": getattr(mt5, "TIMEFRAME_M5", None),
    "15m": getattr(mt5, "TIMEFRAME_M15", None),
    "30m": getattr(mt5, "TIMEFRAME_M30", None),
    "1h": getattr(mt5, "TIMEFRAME_H1", None),
    "4h": getattr(mt5, "TIMEFRAME_H4", None),
    "1d": getattr(mt5, "TIMEFRAME_D1", None),
}

TIMEFRAME_TO_TWELVE = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1h": "1h",
    "4h": "4h",
    "1d": "1day",
}

ACTIVE_SIGNALS = {}
PENDING_ORDERS = {}
CLOSED_SIGNALS = []
ACTIVE_VALID_MINUTES = 30
PENDING_VALID_MINUTES = 45
MIN_ACTIVE_CONFIDENCE = 80
MIN_PENDING_CONFIDENCE = 72
MAX_ACTIVE_SIGNALS = 2
MAX_PENDING_ORDERS = 3


def now_utc():
    return datetime.now(timezone.utc)


def normalize_data(data: pd.DataFrame):
    if data is None or data.empty:
        return data
    if hasattr(data.columns, "nlevels") and data.columns.nlevels > 1:
        data.columns = [c[0] for c in data.columns]
    data = data.reset_index(drop=False)
    data = data.rename(columns={"Datetime": "time", "Date": "time", "Open": "open", "High": "high", "Low": "low", "Close": "close", "Volume": "volume"})
    for col in ["open", "high", "low", "close"]:
        if col not in data.columns:
            return None
    if "volume" not in data.columns:
        data["volume"] = 0
    for col in ["open", "high", "low", "close", "volume"]:
        data[col] = pd.to_numeric(data[col], errors="coerce")
    return data.dropna(subset=["open", "high", "low", "close"]).reset_index(drop=True)


def mt5_initialize():
    if mt5 is None or not MT5_LOGIN or not MT5_PASSWORD or not MT5_SERVER:
        return False
    try:
        if mt5.initialize():
            return bool(mt5.login(login=int(MT5_LOGIN), password=MT5_PASSWORD, server=MT5_SERVER))
        return False
    except Exception:
        return False


def get_market_data_mt5(market: str, interval: str):
    symbol = SYMBOLS.get(market.upper(), {}).get("mt5")
    timeframe = TIMEFRAME_TO_MT5.get(interval)
    if not symbol or timeframe is None or not mt5_initialize():
        return None, None
    try:
        rates = mt5.copy_rates_from_pos(symbol, timeframe, 0, 500)
        if rates is None or len(rates) == 0:
            return None, None
        df = pd.DataFrame(rates)
        df["time"] = pd.to_datetime(df["time"], unit="s", utc=True)
        df = df.rename(columns={"tick_volume": "volume"})
        return normalize_data(df[["time", "open", "high", "low", "close", "volume"]].copy()), "mt5"
    except Exception:
        return None, None


def get_market_data_twelve(market: str, interval: str):
    symbol = SYMBOLS.get(market.upper(), {}).get("twelve")
    td_interval = TIMEFRAME_TO_TWELVE.get(interval)
    if not symbol or not td_interval or not TWELVE_DATA_API_KEY:
        return None, None
    try:
        res = requests.get(
            "https://api.twelvedata.com/time_series",
            params={"symbol": symbol, "interval": td_interval, "outputsize": 500, "apikey": TWELVE_DATA_API_KEY, "timezone": "UTC"},
            timeout=20,
        )
        payload = res.json()
        values = payload.get("values") or []
        if not values:
            return None, None
        df = pd.DataFrame(values).rename(columns={"datetime": "time"})
        df["time"] = pd.to_datetime(df["time"], utc=True)
        for col in ["open", "high", "low", "close", "volume"]:
            if col not in df.columns:
                df[col] = 0
        return normalize_data(df.sort_values("time").reset_index(drop=True)), "twelve"
    except Exception:
        return None, None


def get_market_data_yahoo(market: str, interval: str):
    symbol = SYMBOLS.get(market.upper(), {}).get("yahoo")
    if not symbol:
        return None, None
    try:
        data = yf.download(symbol, period="30d", interval=interval, progress=False, auto_adjust=False)
        if data is None or data.empty:
            return None, None
        return normalize_data(data), "yahoo"
    except Exception:
        return None, None


def get_market_data(market: str, interval: str):
    for provider in (get_market_data_mt5, get_market_data_twelve, get_market_data_yahoo):
        data, source = provider(market, interval)
        if data is not None and not data.empty:
            return data, source
    return None, None


def latest_price(data):
    try:
        return float(data.iloc[-1]["close"])
    except Exception:
        return None


def atr(data, period=14):
    df = data.copy()
    df["prev_close"] = df["close"].shift(1)
    df["tr"] = df.apply(lambda x: max(x["high"] - x["low"], abs(x["high"] - x["prev_close"]) if pd.notna(x["prev_close"]) else 0, abs(x["low"] - x["prev_close"]) if pd.notna(x["prev_close"]) else 0), axis=1)
    value = df["tr"].rolling(period).mean().iloc[-1]
    if pd.isna(value) or value <= 0:
        value = float(df.iloc[-1]["high"] - df.iloc[-1]["low"])
    if value <= 0:
        value = float(df.iloc[-1]["close"]) * 0.001
    return float(value)


def signal_id(market, timeframe, direction, published_at):
    return f"{market}-{timeframe}-{direction}-{published_at}"


def parse_time(value):
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return now_utc()


def quality_rank(item):
    confidence = item.get("confidence", 0)
    priority = 5 if item.get("market") in ["XAUUSD", "EURUSD", "GBPUSD", "GBPJPY", "NASDAQ", "SP500"] else 0
    return confidence + priority


def close_signal(signal, result, price=None):
    signal["status"] = "CLOSED"
    signal["result"] = result
    signal["closed_at"] = now_utc().isoformat()
    signal["closed_price"] = price
    CLOSED_SIGNALS.insert(0, signal)
    while len(CLOSED_SIGNALS) > 100:
        CLOSED_SIGNALS.pop()


def cleanup_books():
    global ACTIVE_SIGNALS, PENDING_ORDERS
    now = now_utc()
    active_clean = []
    for signal in ACTIVE_SIGNALS.values():
        if now > parse_time(signal.get("valid_until")):
            close_signal(signal, "EXPIRED", signal.get("latest_price"))
            continue
        if signal.get("confidence", 0) < MIN_ACTIVE_CONFIDENCE:
            close_signal(signal, "REMOVED_LOW_CONFIDENCE", signal.get("latest_price"))
            continue
        active_clean.append(signal)
    best_active = {}
    for signal in active_clean:
        market = signal.get("market")
        current = best_active.get(market)
        if current is None or quality_rank(signal) > quality_rank(current):
            if current:
                close_signal(current, "REPLACED_BY_BETTER_SIGNAL", current.get("latest_price"))
            best_active[market] = signal
        else:
            close_signal(signal, "REMOVED_DUPLICATE", signal.get("latest_price"))
    ACTIVE_SIGNALS = {s["id"]: s for s in sorted(best_active.values(), key=quality_rank, reverse=True)[:MAX_ACTIVE_SIGNALS]}

    pending_clean = []
    for order in PENDING_ORDERS.values():
        if now > parse_time(order.get("valid_until")):
            close_signal(order, "PENDING_EXPIRED", order.get("latest_price"))
            continue
        if order.get("confidence", 0) < MIN_PENDING_CONFIDENCE:
            close_signal(order, "PENDING_REMOVED_LOW_CONFIDENCE", order.get("latest_price"))
            continue
        pending_clean.append(order)
    best_pending = {}
    for order in pending_clean:
        market = order.get("market")
        current = best_pending.get(market)
        if current is None or quality_rank(order) > quality_rank(current):
            if current:
                close_signal(current, "PENDING_REPLACED_BY_BETTER_ORDER", current.get("latest_price"))
            best_pending[market] = order
        else:
            close_signal(order, "PENDING_REMOVED_DUPLICATE", order.get("latest_price"))
    PENDING_ORDERS = {p["id"]: p for p in sorted(best_pending.values(), key=quality_rank, reverse=True)[:MAX_PENDING_ORDERS]}


def score_bias(strategy_votes):
    buy_score = 0
    sell_score = 0
    buy_reasons = []
    sell_reasons = []

    for vote in strategy_votes.values():
        if isinstance(vote, dict):
            direction = vote.get("direction")
            score = vote.get("score", 0)
            reasons = vote.get("reasons", [])
        elif isinstance(vote, (list, tuple)) and len(vote) >= 2:
            direction = vote[0]
            score = vote[1]
            reasons = vote[2] if len(vote) > 2 and isinstance(vote[2], list) else []
        else:
            continue

        if direction == "BUY":
            buy_score += score
            buy_reasons.extend(reasons)
        elif direction == "SELL":
            sell_score += score
            sell_reasons.extend(reasons)

    if buy_score > sell_score:
        return "BUY", buy_score, sell_score, buy_reasons
    if sell_score > buy_score:
        return "SELL", sell_score, buy_score, sell_reasons
    return "WAIT", buy_score, sell_score, []


def decorate_active(signal_data, interval, price, source):
    published_at = now_utc()
    valid_until = published_at + timedelta(minutes=ACTIVE_VALID_MINUTES)
    signal_data["id"] = signal_id(signal_data["market"], interval, signal_data["decision"], published_at.isoformat())
    signal_data["status"] = "ACTIVE"
    signal_data["published_at"] = published_at.isoformat()
    signal_data["valid_until"] = valid_until.isoformat()
    signal_data["valid_for_minutes"] = ACTIVE_VALID_MINUTES
    signal_data["latest_price"] = price
    signal_data["result"] = "OPEN"
    signal_data["display_decision"] = "STRONG BUY" if signal_data["decision"] == "BUY" else "STRONG SELL"
    signal_data["order_type"] = "MARKET BUY" if signal_data["decision"] == "BUY" else "MARKET SELL"
    signal_data["source"] = source
    return signal_data


def create_pending(signal_data, data, interval, source):
    bias, score, opposite_score, reasons = score_bias(signal_data.get("strategy_votes", {}))
    if bias == "WAIT" or score < 150 or score < opposite_score + 25:
        return None
    price = latest_price(data)
    if price is None:
        return None
    a = atr(data)
    published_at = now_utc()
    valid_until = published_at + timedelta(minutes=PENDING_VALID_MINUTES)
    confidence = min(90, score // 2)
    if confidence < MIN_PENDING_CONFIDENCE:
        return None
    if bias == "BUY":
        trigger = price + a * 0.20
        sl = price - a * 1.10
        tp1, tp2, tp3 = trigger + a * 1.20, trigger + a * 2.00, trigger + a * 3.00
        display, order_type = "PENDING BUY", "BUY STOP"
    else:
        trigger = price - a * 0.20
        sl = price + a * 1.10
        tp1, tp2, tp3 = trigger - a * 1.20, trigger - a * 2.00, trigger - a * 3.00
        display, order_type = "PENDING SELL", "SELL STOP"
    return {
        "id": signal_id(signal_data["market"], interval, bias, published_at.isoformat()),
        "market": signal_data["market"],
        "timeframe": interval,
        "status": "PENDING",
        "display_decision": display,
        "order_type": order_type,
        "bias": bias,
        "trigger_price": round(float(trigger), 5),
        "latest_price": price,
        "stop_loss": round(float(sl), 5),
        "tp1": round(float(tp1), 5),
        "tp2": round(float(tp2), 5),
        "tp3": round(float(tp3), 5),
        "confidence": int(confidence),
        "published_at": published_at.isoformat(),
        "valid_until": valid_until.isoformat(),
        "valid_for_minutes": PENDING_VALID_MINUTES,
        "reasons": reasons if reasons else ["Possible setup forming"],
        "result": "WAITING_TRIGGER",
        "invalidation": "Pending order invalid after expiry or opposite signal.",
        "source": source,
    }


def upsert_active(active):
    for key, old in list(ACTIVE_SIGNALS.items()):
        if old.get("market") == active.get("market"):
            if quality_rank(active) > quality_rank(old):
                close_signal(old, "REPLACED_BY_BETTER_SIGNAL", old.get("latest_price"))
                del ACTIVE_SIGNALS[key]
            else:
                return
    ACTIVE_SIGNALS[active["id"]] = active


def upsert_pending(order):
    for key, old in list(PENDING_ORDERS.items()):
        if old.get("market") == order.get("market"):
            if quality_rank(order) > quality_rank(old):
                close_signal(old, "PENDING_REPLACED_BY_BETTER_ORDER", old.get("latest_price"))
                del PENDING_ORDERS[key]
            else:
                return
    PENDING_ORDERS[order["id"]] = order


def update_signal_results(price_map):
    now = now_utc()
    for key in list(ACTIVE_SIGNALS.keys()):
        signal = ACTIVE_SIGNALS[key]
        price = price_map.get(signal["market"])
        if price is None:
            continue
        signal["latest_price"] = price
        if now > parse_time(signal.get("valid_until")):
            close_signal(signal, "EXPIRED", price)
            del ACTIVE_SIGNALS[key]
            continue
        if signal.get("decision") == "BUY":
            if signal.get("stop_loss") is not None and price <= signal["stop_loss"]:
                close_signal(signal, "STOP_LOSS_HIT", price)
                del ACTIVE_SIGNALS[key]
            elif signal.get("tp1") is not None and price >= signal["tp1"]:
                close_signal(signal, "TP1_HIT", price)
                del ACTIVE_SIGNALS[key]
        elif signal.get("decision") == "SELL":
            if signal.get("stop_loss") is not None and price >= signal["stop_loss"]:
                close_signal(signal, "STOP_LOSS_HIT", price)
                del ACTIVE_SIGNALS[key]
            elif signal.get("tp1") is not None and price <= signal["tp1"]:
                close_signal(signal, "TP1_HIT", price)
                del ACTIVE_SIGNALS[key]

    for key in list(PENDING_ORDERS.keys()):
        order = PENDING_ORDERS[key]
        price = price_map.get(order["market"])
        if price is None:
            continue
        order["latest_price"] = price
        if now > parse_time(order.get("valid_until")):
            close_signal(order, "PENDING_EXPIRED", price)
            del PENDING_ORDERS[key]
            continue
        if order.get("bias") == "BUY" and price >= order.get("trigger_price"):
            upsert_active({
                "id": order["id"], "market": order["market"], "timeframe": order["timeframe"], "decision": "BUY",
                "display_decision": "STRONG BUY", "signal_quality": "STRONG BUY", "entry": order["trigger_price"],
                "stop_loss": order["stop_loss"], "tp1": order["tp1"], "tp2": order["tp2"], "tp3": order["tp3"],
                "confidence": order["confidence"], "risk": "LOW", "rr_to_tp1": None, "reasons": order["reasons"],
                "strategy_votes": {}, "invalidation": "Invalid if price hits stop loss.", "status": "ACTIVE",
                "published_at": now.isoformat(), "valid_until": (now + timedelta(minutes=ACTIVE_VALID_MINUTES)).isoformat(),
                "valid_for_minutes": ACTIVE_VALID_MINUTES, "latest_price": price, "result": "OPEN", "order_type": "TRIGGERED BUY",
                "source": order.get("source", "unknown"),
            })
            del PENDING_ORDERS[key]
        elif order.get("bias") == "SELL" and price <= order.get("trigger_price"):
            upsert_active({
                "id": order["id"], "market": order["market"], "timeframe": order["timeframe"], "decision": "SELL",
                "display_decision": "STRONG SELL", "signal_quality": "STRONG SELL", "entry": order["trigger_price"],
                "stop_loss": order["stop_loss"], "tp1": order["tp1"], "tp2": order["tp2"], "tp3": order["tp3"],
                "confidence": order["confidence"], "risk": "LOW", "rr_to_tp1": None, "reasons": order["reasons"],
                "strategy_votes": {}, "invalidation": "Invalid if price hits stop loss.", "status": "ACTIVE",
                "published_at": now.isoformat(), "valid_until": (now + timedelta(minutes=ACTIVE_VALID_MINUTES)).isoformat(),
                "valid_for_minutes": ACTIVE_VALID_MINUTES, "latest_price": price, "result": "OPEN", "order_type": "TRIGGERED SELL",
                "source": order.get("source", "unknown"),
            })
            del PENDING_ORDERS[key]


@app.get("/")
def home():
    return {"status": "online", "message": "EasyPips MT5-first balanced engine running", "markets": list(SYMBOLS.keys()), "providers": ["mt5", "twelve", "yahoo"]}


@app.get("/health")
def health():
    return {"status": "online", "mt5_enabled": bool(MT5_LOGIN and MT5_PASSWORD and MT5_SERVER and mt5 is not None), "twelve_enabled": bool(TWELVE_DATA_API_KEY)}


@app.get("/pro-signals")
def pro_signals(interval: str = "5m"):
    latest_scan, price_map, provider_map = {}, {}, {}
    cleanup_books()
    for market in SYMBOLS.keys():
        try:
            data, source = get_market_data(market, interval)
            if data is None or data.empty:
                latest_scan[market] = {"market": market, "decision": "WAIT", "display_decision": "NO DATA", "reasons": ["No provider returned data"], "source": "none"}
                continue
            price = latest_price(data)
            price_map[market] = price
            provider_map[market] = source
            engine = EasyPipsEngine(market, data, interval)
            signal = engine.analyze()

            if hasattr(signal, "model_dump"):
                signal_data = signal.model_dump()
            elif hasattr(signal, "dict"):
                signal_data = signal.dict()
            elif hasattr(signal, "__dict__"):
                signal_data = vars(signal)
            else:
                raise TypeError("Unsupported signal object returned by engine.analyze()")

            signal_data["latest_price"] = price
            signal_data["source"] = source
            latest_scan[market] = signal_data

            if signal_data.get("decision") in ["BUY", "SELL"]:
                if signal_data.get("confidence", 0) >= MIN_ACTIVE_CONFIDENCE:
                    upsert_active(decorate_active(signal_data, interval, price, source))
                else:
                    order = create_pending(signal_data, data, interval, source)
                    if order:
                        upsert_pending(order)
        except Exception as e:
            latest_scan[market] = {
                "market": market,
                "decision": "WAIT",
                "display_decision": "ERROR",
                "reasons": [str(e)],
                "source": "error",
            }

    update_signal_results(price_map)
    cleanup_books()
    active = sorted(ACTIVE_SIGNALS.values(), key=quality_rank, reverse=True)
    pending = sorted(PENDING_ORDERS.values(), key=quality_rank, reverse=True)

    return {
        "latest_scan": latest_scan,
        "top_trade": active[0] if active else None,
        "top_pending": pending[0] if pending else None,
        "active": active,
        "pending": pending,
        "closed": CLOSED_SIGNALS[:50],
        "summary": {
            "active_count": len(active),
            "pending_count": len(pending),
            "closed_count": len(CLOSED_SIGNALS),
            "updated_at": now_utc().isoformat(),
            "min_active_confidence": MIN_ACTIVE_CONFIDENCE,
            "min_pending_confidence": MIN_PENDING_CONFIDENCE,
            "mode": "MT5_FIRST_BALANCED",
            "providers": provider_map,
        },
    }