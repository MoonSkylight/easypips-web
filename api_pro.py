from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Union
import os
import uuid
import yfinance as yf
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

supabase: Client | None = None

try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print("Supabase connection error:", e)
    supabase = None

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

MAX_AI_SIGNALS = 6


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


def db_enabled():
    return supabase is not None


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
        "source": "AI Engine",
        "desk": None,
        "symbol": symbol,
        "direction": direction,
        "entry": format_price(symbol, price),
        "sl": format_price(symbol, sl),
        "tp1": format_price(symbol, tp1),
        "tp2": format_price(symbol, tp2),
        "tp3": format_price(symbol, tp3),
        "confidence": 88 if direction == "BUY" else 86,
        "analyst": "AI Engine",
        "note": "Live market generated signal",
        "status": "ACTIVE",
    }


def get_active_signals(source=None, desk=None):
    if not db_enabled():
        return []

    query = supabase.table("signals").select("*").eq("status", "ACTIVE")

    if source:
        query = query.eq("source", source)

    if desk:
        query = query.eq("desk", desk)

    response = query.order("created_at", desc=True).execute()
    return response.data or []


def ai_signal_exists(symbol: str):
    active_ai = get_active_signals(source="AI Engine")

    for signal in active_ai:
        if signal.get("symbol") == symbol:
            return True

    return False


def insert_signal(signal: dict):
    if not db_enabled():
        return signal

    response = supabase.table("signals").insert(signal).execute()

    if response.data:
        return response.data[0]

    return signal


def generate_missing_ai_signals():
    active_ai = get_active_signals(source="AI Engine")

    if len(active_ai) >= MAX_AI_SIGNALS:
        return active_ai[:MAX_AI_SIGNALS]

    for symbol, yahoo_symbol in SYMBOLS.items():
        active_ai = get_active_signals(source="AI Engine")

        if len(active_ai) >= MAX_AI_SIGNALS:
            break

        if ai_signal_exists(symbol):
            continue

        price, previous_price = get_live_price(yahoo_symbol)

        if price is None or previous_price is None:
            continue

        signal = build_ai_signal(symbol, price, previous_price)
        insert_signal(signal)

    return get_active_signals(source="AI Engine")[:MAX_AI_SIGNALS]


@app.get("/")
def root():
    return {
        "service": "EasyPips Pro Signals API",
        "status": "running",
        "database": "connected" if db_enabled() else "not connected",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "database": "connected" if db_enabled() else "not connected",
    }


@app.get("/debug")
def debug():
    return {
        "SUPABASE_URL_exists": bool(SUPABASE_URL),
        "SUPABASE_URL_preview": SUPABASE_URL[:30] + "..." if SUPABASE_URL else None,
        "SUPABASE_KEY_exists": bool(SUPABASE_KEY),
        "SUPABASE_KEY_length": len(SUPABASE_KEY) if SUPABASE_KEY else 0,
        "db_enabled": db_enabled(),
    }


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
        "desk1Signals": get_active_signals(source="Human Desk", desk="Desk 1"),
        "desk2Signals": get_active_signals(source="Human Desk", desk="Desk 2"),
    }


@app.get("/all-paid-signals")
def all_paid_signals():
    return {
        "aiSignals": generate_missing_ai_signals(),
        "desk1Signals": get_active_signals(source="Human Desk", desk="Desk 1"),
        "desk2Signals": get_active_signals(source="Human Desk", desk="Desk 2"),
    }


@app.post("/desk1/signals")
def create_desk1_signal(signal: ManualSignal):
    new_signal = {
        "source": "Human Desk",
        "desk": "Desk 1",
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
    }

    saved = insert_signal(new_signal)
    return {"success": True, "signal": saved}


@app.post("/desk2/signals")
def create_desk2_signal(signal: ManualSignal):
    new_signal = {
        "source": "Human Desk",
        "desk": "Desk 2",
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
    }

    saved = insert_signal(new_signal)
    return {"success": True, "signal": saved}


@app.delete("/signals/{signal_id}")
def delete_signal(signal_id: str):
    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    supabase.table("signals").update({"status": "DELETED"}).eq("id", signal_id).execute()

    return {"success": True}


@app.post("/admin/reset-ai-signals")
def reset_ai_signals():
    if not db_enabled():
        return {"success": False, "message": "Database not connected"}

    supabase.table("signals").update({"status": "DELETED"}).eq("source", "AI Engine").execute()

    return {"success": True, "message": "AI signals reset"}