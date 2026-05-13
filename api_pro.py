from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import os
import requests
from supabase import create_client, Client

app = FastAPI(title="EasyPips API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

class ClientAccountRequest(BaseModel):
    name: str
    platform: str
    broker: Optional[str] = ""
    account_login: Optional[str] = ""
    risk_mode: Optional[str] = "manual"
    max_lot: Optional[float] = 0.01

def db_enabled():
    return supabase is not None

def send_telegram(msg: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": msg},
        )
    except Exception:
        pass

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/news-calendar")
def news_calendar():
    return {
        "status": "ok",
        "events": [
            {"time": "12:30", "currency": "USD", "event": "Non-Farm Payrolls", "impact": "High"},
            {"time": "14:00", "currency": "USD", "event": "ISM PMI", "impact": "High"},
        ],
    }

@app.get("/client-accounts")
def client_accounts():
    if not db_enabled():
        return {"accounts": []}
    res = supabase.table("client_accounts").select("*").execute()
    return {"accounts": res.data or []}

@app.post("/client-accounts/connect")
def connect_account(data: ClientAccountRequest):
    if not db_enabled():
        return {"success": False}
    payload = data.dict()
    payload["status"] = "pending"
    res = supabase.table("client_accounts").insert(payload).execute()
    send_telegram(f"New account: {data.name}")
    return {"success": True, "data": res.data}

@app.post("/client-accounts/{account_id}/toggle-auto-trade")
def toggle(account_id: str):
    if not db_enabled():
        return {"success": False}
    res = supabase.table("client_accounts").update({"auto_trade_enabled": True}).eq("id", account_id).execute()
    return {"success": True, "data": res.data}

@app.get("/desk-performance")
def desk_performance():
    return {
        "Desk 1": {"tpHits": 0, "slHits": 0, "winRate": 0},
        "Desk 2": {"tpHits": 0, "slHits": 0, "winRate": 0},
    }
