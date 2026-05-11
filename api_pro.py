from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from jose import jwt, JWTError
import os
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

# ENV
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
JWT_SECRET = os.environ.get("JWT_SECRET", "secret")
JWT_ALGORITHM = "HS256"

supabase: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# SYMBOLS
SYMBOLS = {
    "EUR/USD": "EURUSD=X",
    "GBP/USD": "GBPUSD=X",
    "AUD/USD": "AUDUSD=X",
    "NZD/USD": "NZDUSD=X",
    "USD/JPY": "JPY=X",
    "USD/CHF": "CHF=X",
    "USD/CAD": "CAD=X",
    "XAU/USD": "GC=F",
}

# MODELS
class ManualSignal(BaseModel):
    symbol: str
    direction: str
    entry: Union[str, float]
    sl: Union[str, float]
    tp1: Union[str, float]
    tp2: Union[str, float]
    tp3: Union[str, float]
    analyst: Optional[str] = "Manual"
    note: Optional[str] = ""


# UTILS
def db():
    return supabase


def get_price(symbol):
    ticker = yf.Ticker(symbol)
    data = ticker.history(period="1d", interval="5m")
    return float(data["Close"].iloc[-1])


def parse(v):
    return float(v)


# 🔥 RESULT TRACKING
def update_results():
    signals = db().table("signals").select("*").eq("status", "ACTIVE").execute().data

    for s in signals:
        symbol = SYMBOLS.get(s["symbol"])
        if not symbol:
            continue

        price = get_price(symbol)

        sl = parse(s["sl"])
        tp1 = parse(s["tp1"])
        tp2 = parse(s["tp2"])
        tp3 = parse(s["tp3"])

        updates = {}

        if s["direction"] == "BUY":
            if price >= tp1:
                updates["hit_tp1"] = True
                updates["result"] = "TP1"
            if price >= tp2:
                updates["hit_tp2"] = True
                updates["result"] = "TP2"
            if price >= tp3:
                updates["hit_tp3"] = True
                updates["result"] = "TP3"
                updates["status"] = "CLOSED"
            if price <= sl:
                updates["hit_sl"] = True
                updates["result"] = "SL"
                updates["status"] = "CLOSED"

        if s["direction"] == "SELL":
            if price <= tp1:
                updates["hit_tp1"] = True
                updates["result"] = "TP1"
            if price <= tp2:
                updates["hit_tp2"] = True
                updates["result"] = "TP2"
            if price <= tp3:
                updates["hit_tp3"] = True
                updates["result"] = "TP3"
                updates["status"] = "CLOSED"
            if price >= sl:
                updates["hit_sl"] = True
                updates["result"] = "SL"
                updates["status"] = "CLOSED"

        if updates:
            db().table("signals").update(updates).eq("id", s["id"]).execute()


# 🔥 STATS
@app.get("/signal-stats")
def stats():
    update_results()

    signals = db().table("signals").select("*").execute().data

    today = datetime.now(timezone.utc).replace(hour=0, minute=0)

    today_count = 0
    week_count = 0
    tp = 0
    sl = 0

    for s in signals:
        created = datetime.fromisoformat(s["created_at"])

        if created >= today:
            today_count += 1

        if created >= datetime.now(timezone.utc) - timedelta(days=7):
            week_count += 1

        if s.get("hit_tp1"):
            tp += 1
        if s.get("hit_sl"):
            sl += 1

    win_rate = (tp / (tp + sl) * 100) if (tp + sl) else 0

    return {
        "today": today_count,
        "week": week_count,
        "tp": tp,
        "sl": sl,
        "winRate": round(win_rate, 2),
    }


# 🔥 SIGNAL FETCH
@app.get("/all-paid-signals")
def all_signals():
    update_results()

    data = db().table("signals").select("*").eq("status", "ACTIVE").execute().data

    return {
        "aiSignals": [s for s in data if s["source"] == "AI Engine"],
        "desk1Signals": [s for s in data if s["desk"] == "Desk 1"],
        "desk2Signals": [s for s in data if s["desk"] == "Desk 2"],
    }


# 🔥 ADMIN LOGIN
@app.post("/admin/login")
def login(data: dict):
    if data["username"] == ADMIN_USERNAME and data["password"] == ADMIN_PASSWORD:
        token = jwt.encode({"admin": True}, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return {"token": token}
    raise HTTPException(401)


def verify(auth):
    token = auth.replace("Bearer ", "")
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except:
        raise HTTPException(401)


# 🔥 CREATE SIGNAL
@app.post("/desk1/signals")
def desk1(signal: ManualSignal, authorization: str = Header()):
    verify(authorization)

    db().table("signals").insert({
        **signal.dict(),
        "source": "Human Desk",
        "desk": "Desk 1",
        "status": "ACTIVE"
    }).execute()

    return {"ok": True}


@app.post("/desk2/signals")
def desk2(signal: ManualSignal, authorization: str = Header()):
    verify(authorization)

    db().table("signals").insert({
        **signal.dict(),
        "source": "Human Desk",
        "desk": "Desk 2",
        "status": "ACTIVE"
    }).execute()

    return {"ok": True}