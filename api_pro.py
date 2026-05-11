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

DESK_1_SIGNALS = []
DESK_2_SIGNALS = []

CACHED_AI_SIGNALS = []
LAST_AI_UPDATE = None
CACHE_MINUTES = 0


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
    """
    Normal forex:
    1 pip = 0.0001
    100 pips = 0.0100

    JPY pairs:
    1 pip = 0.01
    100 pips = 1.00
    """
    if "JPY" in symbol:
        return 0.01
    if "XAU" in symbol:
        return 0.10
    if "BTC" in symbol:
        return 10.0
    return 0.0001


def target_distance(symbol: str) -> float:
    """
    100 pip distance.
    EUR/USD example:
    0.0001 * 100 = 0.0100
    """
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
    if current_price >= previous_price:
        return "BUY"
    return "SELL"


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


def generate_ai_signals():
    signals = []

    for symbol, yahoo_symbol in SYMBOLS.items():
        price, previous_price = get_live_price(yahoo_symbol)

        if price is None or previous_price is None:
            continue

        signals.append(build_ai_signal(symbol, price, previous_price))

    return signals


def get_ai_signals():
    global CACHED_AI_SIGNALS, LAST_AI_UPDATE

    now = datetime.utcnow()

    if LAST_AI_UPDATE and CACHED_AI_SIGNALS:
        if now - LAST_AI_UPDATE < timedelta(minutes=CACHE_MINUTES):
            return CACHED_AI_SIGNALS

    CACHED_AI_SIGNALS = generate_ai_signals()
    LAST_AI_UPDATE = now

    return CACHED_AI_SIGNALS


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
        "mode": "live forex prices",
        "normal_forex_100_pips": "0.0100",
        "jpy_100_pips": "1.00",
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
    return {"aiSignals": get_ai_signals()}


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