from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from jose import jwt, JWTError
import os
import requests
import tempfile
import matplotlib.pyplot as plt
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

# ================= ENV =================
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
JWT_SECRET = os.environ.get("JWT_SECRET", "secret")
JWT_ALGORITHM = "HS256"

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SYMBOLS = {
    "EUR/USD": "EURUSD=X",
    "GBP/USD": "GBPUSD=X",
    "AUD/USD": "AUDUSD=X",
    "NZD/USD": "NZDUSD=X",
    "USD/JPY": "JPY=X",
    "USD/CHF": "CHF=X",
}

Price = Union[str, float, int]


class ManualSignal(BaseModel):
    symbol: str
    direction: str
    entry: Price
    sl: Price
    tp1: Price
    tp2: Price
    tp3: Price


# ================= TELEGRAM =================

def send_telegram(msg):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    requests.post(
        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
        json={"chat_id": TELEGRAM_CHAT_ID, "text": msg, "parse_mode": "Markdown"},
    )


# ================= CHART =================

def chart(symbol, y):
    try:
        d = yf.Ticker(y).history(period="1d", interval="15m")
        f = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
        plt.plot(d["Close"])
        plt.title(symbol)
        plt.savefig(f.name)
        plt.close()
        return f.name
    except:
        return None


# ================= SIGNAL =================

def msg_new(s):
    return f"""
🚀 *EASY PIPS SIGNAL*

📊 {s['symbol']} | {s['direction']}

Entry: `{s['entry']}`
SL: `{s['sl']}`

TP1: `{s['tp1']}`
TP2: `{s['tp2']}`
TP3: `{s['tp3']}`
"""


def msg_update(s, r):
    return f"""
📊 UPDATE

{s['symbol']} → {r}
"""


# ================= DB =================

def get_all_signals():
    return supabase.table("signals").select("*").order("created_at", desc=True).execute().data


def insert_signal(s):
    res = supabase.table("signals").insert(s).execute()
    if res.data:
        saved = res.data[0]
        ch = chart(saved["symbol"], SYMBOLS.get(saved["symbol"]))
        if ch:
            send_photo(msg_new(saved), ch)
        else:
            send_telegram(msg_new(saved))
        return saved


def send_photo(msg, path):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    with open(path, "rb") as p:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto",
            data={"chat_id": TELEGRAM_CHAT_ID, "caption": msg, "parse_mode": "Markdown"},
            files={"photo": p},
        )


# ================= PRICE =================

def price(y):
    d = yf.Ticker(y).history(period="1d", interval="15m")
    return float(d["Close"].iloc[-1])


# ================= STRATEGY =================

def analyze(symbol):
    y = SYMBOLS[symbol]
    d = yf.Ticker(y).history(period="5d", interval="15m")

    if len(d) < 80:
        return None

    close = d["Close"]
    ema20 = close.ewm(span=20).mean()
    ema50 = close.ewm(span=50).mean()

    p = float(close.iloc[-1])
    prev = float(close.iloc[-5])

    if p > ema50.iloc[-1] and ema20.iloc[-1] > ema50.iloc[-1] and p > prev:
        return ("BUY", p)

    if p < ema50.iloc[-1] and ema20.iloc[-1] < ema50.iloc[-1] and p < prev:
        return ("SELL", p)

    return None


# ================= UPDATE RESULTS =================

def update_results():
    rows = supabase.table("signals").select("*").eq("status", "ACTIVE").execute().data

    for s in rows:
        y = SYMBOLS.get(s["symbol"])
        p = price(y)

        sl = float(s["sl"])
        tp1 = float(s["tp1"])
        tp2 = float(s["tp2"])
        tp3 = float(s["tp3"])

        updates = {}

        if s["direction"] == "BUY":
            if p >= tp3:
                updates = {"status": "CLOSED", "result": "TP3"}
            elif p <= sl:
                updates = {"status": "CLOSED", "result": "SL"}

        if s["direction"] == "SELL":
            if p <= tp3:
                updates = {"status": "CLOSED", "result": "TP3"}
            elif p >= sl:
                updates = {"status": "CLOSED", "result": "SL"}

        if updates:
            supabase.table("signals").update(updates).eq("id", s["id"]).execute()
            send_telegram(msg_update(s, updates.get("result", "")))


# ================= STATS =================

def stats():
    update_results()
    all = get_all_signals()

    tp = sum(1 for s in all if s.get("result") == "TP3")
    sl = sum(1 for s in all if s.get("result") == "SL")

    win = round(tp / (tp + sl) * 100, 2) if tp + sl else 0

    return {"total": len(all), "tp": tp, "sl": sl, "winRate": win}


# ================= SYSTEM MONITOR =================

@app.get("/system-status")
def system_status():
    signals = get_all_signals()

    return {
        "status": "running",
        "totalSignals": len(signals),
        "activeSignals": len([s for s in signals if s.get("status") == "ACTIVE"]),
        "closedSignals": len([s for s in signals if s.get("status") == "CLOSED"]),
        "telegram": "connected" if TELEGRAM_BOT_TOKEN else "not set",
        "time": datetime.now(timezone.utc).isoformat(),
    }


# ================= ROUTES =================

@app.get("/")
def root():
    return {"ok": True}


@app.get("/cron-check")
def cron():
    for s in SYMBOLS:
        if analyze(s):
            d, p = analyze(s)
            insert_signal({
                "symbol": s,
                "direction": d,
                "entry": p,
                "sl": p - 0.01 if d == "BUY" else p + 0.01,
                "tp1": p + 0.01 if d == "BUY" else p - 0.01,
                "tp2": p + 0.02 if d == "BUY" else p - 0.02,
                "tp3": p + 0.03 if d == "BUY" else p - 0.03,
                "status": "ACTIVE"
            })

    update_results()
    return {"ok": True}


@app.get("/signal-stats")
def signal_stats():
    return stats()


@app.get("/daily-report")
def daily():
    s = stats()
    send_telegram(f"""
📊 DAILY REPORT

Signals: {s['total']}
TP: {s['tp']}
SL: {s['sl']}
WinRate: {s['winRate']}%
""")
    return s


@app.post("/desk1/signals")
def desk1(s: ManualSignal):
    insert_signal({**s.dict(), "status": "ACTIVE"})
    return {"ok": True}


@app.post("/desk2/signals")
def desk2(s: ManualSignal):
    insert_signal({**s.dict(), "status": "ACTIVE"})
    return {"ok": True}