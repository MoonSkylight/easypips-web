from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Union
import uuid

app = FastAPI(title="EasyPips Pro Signals API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Price = Union[str, float, int]

AI_SIGNALS = [
    {
        "id": str(uuid.uuid4()),
        "symbol": "EUR/USD",
        "direction": "BUY",
        "entry": "1.08200",
        "sl": "1.07800",
        "tp1": "1.08500",
        "tp2": "1.08800",
        "tp3": "1.09200",
        "confidence": 91,
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": str(uuid.uuid4()),
        "symbol": "XAU/USD",
        "direction": "SELL",
        "entry": "2345.00",
        "sl": "2353.00",
        "tp1": "2338.00",
        "tp2": "2330.00",
        "tp3": "2318.00",
        "confidence": 87,
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat(),
    },
]

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


def clean_price(value):
    return str(value)


def format_signal(signal, source="AI Engine", desk=None):
    return {
        "id": signal.get("id", str(uuid.uuid4())),
        "source": source,
        "desk": desk,
        "symbol": signal.get("symbol"),
        "direction": signal.get("direction", "BUY").upper(),
        "entry": clean_price(signal.get("entry")),
        "sl": clean_price(signal.get("sl")),
        "tp1": clean_price(signal.get("tp1")),
        "tp2": clean_price(signal.get("tp2")),
        "tp3": clean_price(signal.get("tp3")),
        "confidence": signal.get("confidence"),
        "analyst": signal.get("analyst"),
        "note": signal.get("note", ""),
        "status": signal.get("status", "ACTIVE"),
        "created_at": signal.get("created_at", datetime.utcnow().isoformat()),
    }


@app.get("/")
def root():
    return {"service": "EasyPips Pro Signals API", "status": "running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/all-paid-signals")
def get_all_paid_signals():
    return {
        "aiSignals": [format_signal(s, "AI Engine") for s in AI_SIGNALS],
        "desk1Signals": [format_signal(s, "Human Desk", "Desk 1") for s in DESK_1_SIGNALS],
        "desk2Signals": [format_signal(s, "Human Desk", "Desk 2") for s in DESK_2_SIGNALS],
    }


@app.get("/human-signals")
def get_human_signals():
    return {
        "desk1Signals": [format_signal(s, "Human Desk", "Desk 1") for s in DESK_1_SIGNALS],
        "desk2Signals": [format_signal(s, "Human Desk", "Desk 2") for s in DESK_2_SIGNALS],
    }


@app.post("/desk1/signals")
def create_desk1_signal(signal: ManualSignal):
    new_signal = signal.dict()
    new_signal["id"] = str(uuid.uuid4())
    new_signal["status"] = "ACTIVE"
    new_signal["created_at"] = datetime.utcnow().isoformat()
    DESK_1_SIGNALS.insert(0, new_signal)
    return {"success": True, "signal": format_signal(new_signal, "Human Desk", "Desk 1")}


@app.post("/desk2/signals")
def create_desk2_signal(signal: ManualSignal):
    new_signal = signal.dict()
    new_signal["id"] = str(uuid.uuid4())
    new_signal["status"] = "ACTIVE"
    new_signal["created_at"] = datetime.utcnow().isoformat()
    DESK_2_SIGNALS.insert(0, new_signal)
    return {"success": True, "signal": format_signal(new_signal, "Human Desk", "Desk 2")}


@app.delete("/signals/{desk}/{signal_id}")
def delete_signal(desk: str, signal_id: str):
    target = DESK_1_SIGNALS if desk == "desk1" else DESK_2_SIGNALS

    for signal in target:
        if signal["id"] == signal_id:
            target.remove(signal)
            return {"success": True}

    return {"success": False, "message": "Signal not found"}