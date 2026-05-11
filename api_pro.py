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

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-this-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

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


class AdminLogin(BaseModel):
    username: str
    password: str


def db_enabled():
    return supabase is not None


def create_admin_token():
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": "admin",
        "role": "admin",
        "exp": expire,
    }
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


def insert_signal(signal: dict):
    if not db_enabled():
        return signal

    response = supabase.table("signals").insert(signal).execute()

    if response.data:
        return response.data[0]

    return signal


def ai_signal_exists(symbol: str):
    active_ai = get_active_signals(source="AI Engine")
    return any(signal.get("symbol") == symbol for signal in active_ai)


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

        hit_tp1 = bool(signal.get("hit_tp1"))
        hit_tp2 = bool(signal.get("hit_tp2"))
        hit_tp3 = bool(signal.get("hit_tp3"))
        hit_sl = bool(signal.get("hit_sl"))

        if direction == "BUY":
            if price >= tp1 and not hit_tp1:
                updates["hit_tp1"] = True
                updates["result"] = "TP1"

            if price >= tp2 and not hit_tp2:
                updates["hit_tp2"] = True
                updates["result"] = "TP2"

            if price >= tp3 and not hit_tp3:
                updates["hit_tp3"] = True
                updates["result"] = "TP3"
                updates["status"] = "CLOSED"
                updates["closed_at"] = datetime.now(timezone.utc).isoformat()

            if price <= sl and not hit_sl:
                updates["hit_sl"] = True
                updates["result"] = "SL"
                updates["status"] = "CLOSED"
                updates["closed_at"] = datetime.now(timezone.utc).isoformat()

        elif direction == "SELL":
            if price <= tp1 and not hit_tp1:
                updates["hit_tp1"] = True
                updates["result"] = "TP1"

            if price <= tp2 and not hit_tp2:
                updates["hit_tp2"] = True
                updates["result"] = "TP2"

            if price <= tp3 and not hit_tp3:
                updates["hit_tp3"] = True
                updates["result"] = "TP3"
                updates["status"] = "CLOSED"
                updates["closed_at"] = datetime.now(timezone.utc).isoformat()

            if price >= sl and not hit_sl:
                updates["hit_sl"] = True
                updates["result"] = "SL"
                updates["status"] = "CLOSED"
                updates["closed_at"] = datetime.now(timezone.utc).isoformat()

        if updates:
            supabase.table("signals").update(updates).eq("id", signal["id"]).execute()
            signal.update(updates)

        updated_signals.append(signal)

    return updated_signals


def parse_datetime(value: str):
    if value.endswith("Z"):
        value = value.replace("Z", "+00:00")
    return datetime.fromisoformat(value)


@app.get("/")
def root():
    return {
        "service": "EasyPips Pro Signals API",
        "status": "running",
        "database": "connected" if db_enabled() else "not connected",
        "result_tracking": "enabled",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "database": "connected" if db_enabled() else "not connected",
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


@app.get("/live-prices")
def live_prices():
    prices = {}

    for symbol, yahoo_symbol in SYMBOLS.items():
        price, _ = get_live_price(yahoo_symbol)
        prices[symbol] = format_price(symbol, price) if price else None

    return prices


@app.get("/signal-stats")
def signal_stats():
    if not db_enabled():
        return {"error": "Database not connected"}

    update_all_running_results()

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    signals = get_all_signals()

    today_count = 0
    week_count = 0
    ai_count = 0
    desk1_count = 0
    desk2_count = 0
    running_count = 0
    closed_count = 0
    tp1_count = 0
    tp2_count = 0
    tp3_count = 0
    sl_count = 0

    for signal in signals:
        created_at = parse_datetime(signal["created_at"])

        if created_at >= today_start:
            today_count += 1

        if created_at >= week_start:
            week_count += 1

        if signal.get("source") == "AI Engine":
            ai_count += 1

        if signal.get("desk") == "Desk 1":
            desk1_count += 1

        if signal.get("desk") == "Desk 2":
            desk2_count += 1

        if signal.get("status") == "ACTIVE":
            running_count += 1

        if signal.get("status") == "CLOSED":
            closed_count += 1

        if signal.get("hit_tp1"):
            tp1_count += 1

        if signal.get("hit_tp2"):
            tp2_count += 1

        if signal.get("hit_tp3"):
            tp3_count += 1

        if signal.get("hit_sl"):
            sl_count += 1

    finished = tp1_count + sl_count
    win_rate = round((tp1_count / finished) * 100, 2) if finished > 0 else 0

    return {
        "todaySignals": today_count,
        "last7DaysSignals": week_count,
        "totalSignals": len(signals),
        "aiSignals": ai_count,
        "desk1Signals": desk1_count,
        "desk2Signals": desk2_count,
        "runningSignals": running_count,
        "closedSignals": closed_count,
        "tp1Hits": tp1_count,
        "tp2Hits": tp2_count,
        "tp3Hits": tp3_count,
        "slHits": sl_count,
        "winRate": win_rate,
    }


@app.post("/update-results")
def update_results(authorization: str = Header(default="")):
    verify_admin_token(authorization)
    updated = update_all_running_results()
    return {"success": True, "checkedSignals": len(updated)}


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
    update_all_running_results()

    return {
        "aiSignals": generate_missing_ai_signals(),
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


@app.post("/desk1/signals")
def create_desk1_signal(
    signal: ManualSignal,
    authorization: str = Header(default=""),
):
    verify_admin_token(authorization)

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
        "result": "RUNNING",
        "hit_tp1": False,
        "hit_tp2": False,
        "hit_tp3": False,
        "hit_sl": False,
    }

    saved = insert_signal(new_signal)
    return {"success": True, "signal": saved}


@app.post("/desk2/signals")
def create_desk2_signal(
    signal: ManualSignal,
    authorization: str = Header(default=""),
):
    verify_admin_token(authorization)

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
        "result": "RUNNING",
        "hit_tp1": False,
        "hit_tp2": False,
        "hit_tp3": False,
        "hit_sl": False,
    }

    saved = insert_signal(new_signal)
    return {"success": True, "signal": saved}


@app.delete("/signals/{signal_id}")
def delete_signal(
    signal_id: str,
    authorization: str = Header(default=""),
):
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