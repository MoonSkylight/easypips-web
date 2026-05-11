from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, Union
import uuid
import yfinance as yf

app = FastAPI(title="EasyPips Pro Signals API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

ACTIVE_AI_SIGNALS = []
DESK_1_SIGNALS = []
DESK_2_SIGNALS = []

MAX_AI_SIGNALS = 6
SIGNAL_VALID_HOURS = 24


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
        ticker = yf.Ticker(yahoo_symbol)
        data = ticker.history(period="2d", interval="15m")

        if data.empty:
            return None, None

        current_price = float(data["Close"].iloc[-1])
        previous_price = (
            float(data["Close"].iloc[-5])
            if len(data) >= 5
            else float(data["Close"].iloc[0])
        )

        return current_price, previous_price

    except Exception:
        return None, None


def decide_direction(current_price: float, previous_price: float) -> str:
    return "BUY" if current_price >= previous_price else "SELL"


def build_ai_signal(symbol: str, price: float, previous_price: float):
    direction = decide_direction(price, previous_price)
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
        "id": str(uuid.uuid4()),
        "source": "AI Engine",
        "symbol": symbol,
        "direction": direction,
        "entry": format_price(symbol, price),
        "sl": format_price(symbol, sl),
        "tp1": format_price(symbol, tp1),
        "tp2": format_price(symbol, tp2),
        "tp3": format_price(symbol, tp3),
        "confidence": 88 if direction == "BUY" else 86,
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat(),
    }


def remove_expired_ai_signals():
    global ACTIVE_AI_SIGNALS

    now = datetime.utcnow()
    fresh_signals = []

    for signal in ACTIVE_AI_SIGNALS:
        created_at = datetime.fromisoformat(signal["created_at"])
        if now - created_at < timedelta(hours=SIGNAL_VALID_HOURS):
            fresh_signals.append(signal)

    ACTIVE_AI_SIGNALS = fresh_signals


def ai_signal_exists(symbol: str):
    for signal in ACTIVE_AI_SIGNALS:
        if signal["symbol"] == symbol and signal["status"] == "ACTIVE":
            return True
    return False


def generate_missing_ai_signals():
    remove_expired_ai_signals()

    if len(ACTIVE_AI_SIGNALS) >= MAX_AI_SIGNALS:
        return ACTIVE_AI_SIGNALS

    for symbol, yahoo_symbol in SYMBOLS.items():
        if len(ACTIVE_AI_SIGNALS) >= MAX_AI_SIGNALS:
            break

        if ai_signal_exists(symbol):
            continue

        price, previous_price = get_live_price(yahoo_symbol)

        if price is None or previous_price is None:
            continue

        signal = build_ai_signal(symbol, price, previous_price)
        ACTIVE_AI_SIGNALS.append(signal)

    return ACTIVE_AI_SIGNALS


def format_signal(signal, source="AI Engine", desk=None):
    return {
        "id": signal.get("id", str(uuid.uuid4())),
        "source": source,
        "desk": desk,
        "symbol": signal.get("symbol"),
        "direction": signal.get("direction", "BUY").upper(),
        "entry": str(signal.get("entry")),
        "sl": str(signal.get("sl")),
        "tp1": str(signal.get("tp1")),
        "tp2": str(signal.get("tp2")),
        "tp3": str(signal.get("tp3")),
        "confidence": signal.get("confidence"),
        "analyst": signal.get("analyst"),
        "note": signal.get("note", ""),
        "status": signal.get("status", "ACTIVE"),
        "created_at": signal.get("created_at", datetime.utcnow().isoformat()),
    }


@app.get("/")
def root():
    return {
        "service": "EasyPips Pro Signals API",
        "status": "running",
        "mode": "firm published signals",
        "normal_forex_100_pips": "0.0100",
        "jpy_100_pips": "1.00",
        "signal_valid_hours": SIGNAL_VALID_HOURS,
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/live-prices")
def live_prices():
    prices = {}

    for symbol, yahoo_symbol in SYMBOLS.items():
        price, _ = get_live_price(yahoo_symbol)
        prices[symbol] = format_price(symbol, price) if price else None

    return prices


@app.get("/pro-signals")
def pro_signals():
    return {"aiSignals": generate_missing_ai_signals()}


@app.get("/human-signals")
def human_signals():
    return {
        "desk1Signals": [
            format_signal(signal, "Human Desk", "Desk 1")
            for signal in DESK_1_SIGNALS
        ],
        "desk2Signals": [
            format_signal(signal, "Human Desk", "Desk 2")
            for signal in DESK_2_SIGNALS
        ],
    }


@app.get("/all-paid-signals")
def all_paid_signals():
    return {
        "aiSignals": generate_missing_ai_signals(),
        "desk1Signals": [
            format_signal(signal, "Human Desk", "Desk 1")
            for signal in DESK_1_SIGNALS
        ],
        "desk2Signals": [
            format_signal(signal, "Human Desk", "Desk 2")
            for signal in DESK_2_SIGNALS
        ],
    }


@app.post("/desk1/signals")
def create_desk1_signal(signal: ManualSignal):
    new_signal = signal.dict()
    new_signal["id"] = str(uuid.uuid4())
    new_signal["status"] = "ACTIVE"
    new_signal["created_at"] = datetime.utcnow().isoformat()

    DESK_1_SIGNALS.insert(0, new_signal)

    return {
        "success": True,
        "signal": format_signal(new_signal, "Human Desk", "Desk 1"),
    }


@app.post("/desk2/signals")
def create_desk2_signal(signal: ManualSignal):
    new_signal = signal.dict()
    new_signal["id"] = str(uuid.uuid4())
    new_signal["status"] = "ACTIVE"
    new_signal["created_at"] = datetime.utcnow().isoformat()

    DESK_2_SIGNALS.insert(0, new_signal)

    return {
        "success": True,
        "signal": format_signal(new_signal, "Human Desk", "Desk 2"),
    }


@app.delete("/signals/{desk}/{signal_id}")
def delete_signal(desk: str, signal_id: str):
    if desk == "ai":
        target = ACTIVE_AI_SIGNALS
    elif desk == "desk1":
        target = DESK_1_SIGNALS
    elif desk == "desk2":
        target = DESK_2_SIGNALS
    else:
        return {"success": False, "message": "Invalid desk"}

    for signal in target:
        if signal["id"] == signal_id:
            target.remove(signal)
            return {"success": True}

    return {"success": False, "message": "Signal not found"}


@app.post("/admin/reset-ai-signals")
def reset_ai_signals():
    ACTIVE_AI_SIGNALS.clear()
    return {"success": True, "message": "AI signals reset"}