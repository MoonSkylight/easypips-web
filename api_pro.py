from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid

app = FastAPI(title="EasyPips Pro Signals API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AI_SIGNALS = [
    {
        "id": str(uuid.uuid4()),
        "source": "AI Engine",
        "symbol": "EURUSD",
        "direction": "BUY",
        "entry": 1.0820,
        "sl": 1.0780,
        "tp1": 1.0850,
        "tp2": 1.0880,
        "tp3": 1.0920,
        "confidence": 91,
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": str(uuid.uuid4()),
        "source": "AI Engine",
        "symbol": "XAUUSD",
        "direction": "SELL",
        "entry": 2345.0,
        "sl": 2353.0,
        "tp1": 2338.0,
        "tp2": 2330.0,
        "tp3": 2318.0,
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
    entry: float
    sl: float
    tp1: float
    tp2: float
    tp3: float
    analyst: Optional[str] = "EasyPips Analyst"
    note: Optional[str] = ""


def format_signal(signal, source="AI Engine", desk=None):
    return {
        "id": signal.get("id", str(uuid.uuid4())),
        "source": source,
        "desk": desk,
        "symbol": signal.get("symbol"),
        "direction": signal.get("direction", "BUY").upper(),
        "entry": signal.get("entry"),
        "sl": signal.get("sl"),
        "tp1": signal.get("tp1"),
        "tp2": signal.get("tp2"),
        "tp3": signal.get("tp3"),
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
        "routes": [
            "/health",
            "/all-paid-signals",
            "/pro-signals",
            "/human-signals",
            "/desk1/signals",
            "/desk2/signals",
        ],
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/pro-signals")
def get_ai_signals():
    return {
        "aiSignals": [
            format_signal(signal, source="AI Engine")
            for signal in AI_SIGNALS
        ]
    }


@app.get("/human-signals")
def get_human_signals():
    return {
        "desk1Signals": [
            format_signal(signal, source="Human Desk", desk="Desk 1")
            for signal in DESK_1_SIGNALS
        ],
        "desk2Signals": [
            format_signal(signal, source="Human Desk", desk="Desk 2")
            for signal in DESK_2_SIGNALS
        ],
    }


@app.get("/all-paid-signals")
def get_all_paid_signals():
    return {
        "aiSignals": [
            format_signal(signal, source="AI Engine")
            for signal in AI_SIGNALS
        ],
        "desk1Signals": [
            format_signal(signal, source="Human Desk", desk="Desk 1")
            for signal in DESK_1_SIGNALS
        ],
        "desk2Signals": [
            format_signal(signal, source="Human Desk", desk="Desk 2")
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
        "signal": format_signal(
            new_signal,
            source="Human Desk",
            desk="Desk 1",
        ),
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
        "signal": format_signal(
            new_signal,
            source="Human Desk",
            desk="Desk 2",
        ),
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