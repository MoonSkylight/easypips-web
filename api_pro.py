from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Union
import uuid
import random
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
    "USD/JPY": "JPY=X",
    "USD/CHF": "CHF=X",
    "AUD/USD": "AUDUSD=X",
    "NZD/USD": "NZDUSD=X",
    "USD/CAD": "CAD=X",
    "XAU/USD": "GC=F",
    "BTC/USD": "BTC-USD",
}

DESK_1_SIGNALS = []
DESK_2_SIGNALS = []


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


def get_live_price(yahoo_symbol: str):
    try:
        ticker = yf.Ticker(yahoo_symbol)
        data = ticker.history(period="1d", interval="5m")
        if data.empty:
            return None

        return float(data["Close"].iloc[-1])
    except Exception:
        return None


def build_ai_signal(symbol: str, price: float):
    direction = random.choice(["BUY", "SELL"])

    if "JPY" in symbol:
        step = 0.15
    elif "XAU" in symbol:
        step = 7.0
    elif "BTC" in symbol:
        step = 800.0
    else:
        step = 0.0015

    if direction == "BUY":
        sl = price - step
        tp1 = price + step
        tp2 = price + step * 2
        tp3 = price + step * 3
    else:
        sl = price + step
        tp1 = price - step
        tp2 = price - step * 2
        tp3 = price - step * 3

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
        "confidence": random.randint(82, 94),
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat(),
    }


def get_ai_signals():
    signals = []

    for symbol, yahoo_symbol in SYMBOLS.items():
        price = get_live_price(yahoo_symbol)

        if price is not None:
            signals.append(build_ai_signal(symbol, price))

    return signals[:6]


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
        "mode": "live forex data via Yahoo Finance",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/live-prices")
def live_prices():
    prices = {}

    for symbol, yahoo_symbol in SYMBOLS.items():
        price = get_live_price(yahoo_symbol)
        prices[symbol] = format_price(symbol, price) if price else None

    return prices


@app.get("/pro-signals")
def pro_signals():
    return {
        "aiSignals": get_ai_signals()
    }


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
        "aiSignals": get_ai_signals(),
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
    if desk == "desk1":
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