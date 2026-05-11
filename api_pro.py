from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone
import math
import yfinance as yf

from engine import EasyPipsEngine

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://easypips-web.vercel.app",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYMBOLS = {
    "XAUUSD": "XAUUSD=X",
    "OIL": "CL=F",
    "SP500": "^GSPC",
    "NASDAQ": "^IXIC",
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "USDJPY=X",
    "USDCHF": "USDCHF=X",
    "USDCAD": "USDCAD=X",
    "AUDUSD": "AUDUSD=X",
    "NZDUSD": "NZDUSD=X",
    "EURJPY": "EURJPY=X",
    "GBPJPY": "GBPJPY=X",
    "EURGBP": "EURGBP=X",
    "AUDJPY": "AUDJPY=X",
    "EURAUD": "EURAUD=X",
}

ACTIVE_SIGNALS = {}
PENDING_ORDERS = {}
CLOSED_SIGNALS = []

ACTIVE_VALID_MINUTES = 180
PENDING_VALID_MINUTES = 90

MIN_ACTIVE_CONFIDENCE = 80
MIN_PENDING_CONFIDENCE = 70
MAX_ACTIVE_SIGNALS = 8
MAX_PENDING_ORDERS = 10


def now_utc():
    return datetime.now(timezone.utc)


def normalize_data(data):
    if data.empty:
        return data

    if hasattr(data.columns, "nlevels") and data.columns.nlevels > 1:
        data.columns = [c[0] for c in data.columns]

    data = data.reset_index()
    data = data.rename(
        columns={
            "Datetime": "time",
            "Date": "time",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
        }
    )
    return data


def get_market_data(market: str, interval: str):
    symbol = SYMBOLS.get(market.upper())

    if not symbol:
        return None

    data = yf.download(
        symbol,
        period="30d",
        interval=interval,
        progress=False,
        auto_adjust=False,
    )

    if data.empty:
        return None

    return normalize_data(data)


def latest_price(data):
    try:
        value = float(data.iloc[-1]["close"])
        if math.isnan(value) or math.isinf(value):
            return None
        return value
    except Exception:
        return None


def safe_float(value):
    try:
        if value is None:
            return None
        num = float(value)
        if math.isnan(num) or math.isinf(num):
            return None
        return num
    except Exception:
        return None


def atr(data, period=14):
    df = data.copy()
    df["prev_close"] = df["close"].shift(1)

    df["tr"] = df.apply(
        lambda x: max(
            x["high"] - x["low"],
            abs(x["high"] - x["prev_close"]) if x["prev_close"] == x["prev_close"] else 0,
            abs(x["low"] - x["prev_close"]) if x["prev_close"] == x["prev_close"] else 0,
        ),
        axis=1,
    )

    value = df["tr"].rolling(period).mean().iloc[-1]

    if value != value or value == 0:
        value = float(df["high"].iloc[-1] - df["low"].iloc[-1])

    if value == 0:
        value = float(df["close"].iloc[-1]) * 0.001

    return float(value)


def signal_id(market, timeframe, direction, published_at):
    return f"{market}_{timeframe}_{direction}_{published_at}"


def parse_time(value):
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return now_utc()


def serialize_strategy_votes(strategy_votes):
    clean = {}
    if not isinstance(strategy_votes, dict):
        return clean

    for key, vote in strategy_votes.items():
        if isinstance(vote, dict):
            clean[key] = {
                "direction": vote.get("direction", "WAIT"),
                "score": int(vote.get("score", 0) or 0),
                "reasons": vote.get("reasons", []) or [],
            }
        elif isinstance(vote, (list, tuple)):
            clean[key] = {
                "direction": vote[0] if len(vote) > 0 else "WAIT",
                "score": int(vote[1] if len(vote) > 1 else 0),
                "reasons": list(vote[2]) if len(vote) > 2 and vote[2] else [],
            }

    return clean


def score_bias(strategy_votes):
    buy_score = 0
    sell_score = 0
    buy_reasons = []
    sell_reasons = []

    for vote in strategy_votes.values():
        direction = vote.get("direction")
        score = vote.get("score", 0)
        reasons = vote.get("reasons", [])

        if direction == "BUY":
            buy_score += score
            buy_reasons.extend(reasons)

        if direction == "SELL":
            sell_score += score
            sell_reasons.extend(reasons)

    if buy_score > sell_score:
        return "BUY", buy_score, sell_score, buy_reasons

    if sell_score > buy_score:
        return "SELL", sell_score, buy_score, sell_reasons

    return "WAIT", buy_score, sell_score, []


def quality_rank(item):
    confidence = item.get("confidence", 0)
    market = item.get("market", "")

    priority = 0
    if market in ["XAUUSD", "EURUSD", "GBPUSD", "GBPJPY", "NASDAQ", "SP500"]:
        priority += 5

    tp_hits = 0
    if item.get("tp1_hit"):
        tp_hits += 1
    if item.get("tp2_hit"):
        tp_hits += 1
    if item.get("tp3_hit"):
        tp_hits += 1

    return confidence + priority + (tp_hits * 2)


def close_signal(signal, result, price=None):
    signal["status"] = "CLOSED"
    signal["result"] = result
    signal["closed_at"] = now_utc().isoformat()
    signal["closed_price"] = safe_float(price)
    CLOSED_SIGNALS.insert(0, signal)

    while len(CLOSED_SIGNALS) > 100:
        CLOSED_SIGNALS.pop()


def cleanup_books():
    global ACTIVE_SIGNALS, PENDING_ORDERS

    now = now_utc()

    active_clean = []
    for signal in ACTIVE_SIGNALS.values():
        if signal.get("status") in ["STOPPED", "CLOSED"]:
            continue

        if now > parse_time(signal.get("valid_until")):
            signal["status"] = "EXPIRED"
            signal["result"] = signal.get("result") or "EXPIRED"
            active_clean.append(signal)
            continue

        active_clean.append(signal)

    best_active = {}
    for signal in active_clean:
        market = signal.get("market")
        current = best_active.get(market)

        if current is None or quality_rank(signal) > quality_rank(current):
            best_active[market] = signal

    active_sorted = sorted(best_active.values(), key=quality_rank, reverse=True)[:MAX_ACTIVE_SIGNALS]
    ACTIVE_SIGNALS = {s["id"]: s for s in active_sorted}

    pending_clean = []
    for order in PENDING_ORDERS.values():
        if now > parse_time(order.get("valid_until")):
            close_signal(order, "PENDING_EXPIRED", order.get("latest_price"))
            continue

        if order.get("confidence", 0) < MIN_PENDING_CONFIDENCE:
            close_signal(order, "PENDING_REMOVED_LOW_CONFIDENCE", order.get("latest_price"))
            continue

        pending_clean.append(order)

    best_pending = {}
    for order in pending_clean:
        market = order.get("market")
        current = best_pending.get(market)

        if current is None or quality_rank(order) > quality_rank(current):
            if current:
                close_signal(current, "PENDING_REPLACED_BY_BETTER_ORDER", current.get("latest_price"))
            best_pending[market] = order
        else:
            close_signal(order, "PENDING_REMOVED_DUPLICATE", order.get("latest_price"))

    pending_sorted = sorted(best_pending.values(), key=quality_rank, reverse=True)[:MAX_PENDING_ORDERS]
    PENDING_ORDERS = {p["id"]: p for p in pending_sorted}


def decorate_scan_signal(signal_data, latest):
    signal_data["latest_price"] = safe_float(latest)
    signal_data["entry"] = safe_float(signal_data.get("entry"))
    signal_data["stop_loss"] = safe_float(signal_data.get("stop_loss", signal_data.get("stoploss")))
    signal_data["stoploss"] = signal_data["stop_loss"]
    signal_data["tp1"] = safe_float(signal_data.get("tp1"))
    signal_data["tp2"] = safe_float(signal_data.get("tp2"))
    signal_data["tp3"] = safe_float(signal_data.get("tp3"))
    signal_data["rr_to_tp1"] = safe_float(signal_data.get("rr_to_tp1"))
    signal_data["trigger_price"] = safe_float(signal_data.get("trigger_price"))
    signal_data["closed_price"] = safe_float(signal_data.get("closed_price"))
    signal_data["strategy_votes"] = serialize_strategy_votes(signal_data.get("strategy_votes", {}))
    signal_data["tp1_hit"] = bool(signal_data.get("tp1_hit", False))
    signal_data["tp2_hit"] = bool(signal_data.get("tp2_hit", False))
    signal_data["tp3_hit"] = bool(signal_data.get("tp3_hit", False))

    if not signal_data.get("display_decision"):
        decision = signal_data.get("decision", "WAIT")
        if decision == "BUY":
            signal_data["display_decision"] = "STRONG BUY"
        elif decision == "SELL":
            signal_data["display_decision"] = "STRONG SELL"
        else:
            signal_data["display_decision"] = "NO SIGNAL"

    return signal_data


def decorate_active(signal_data, data, interval):
    published_at = now_utc()
    valid_until = published_at + timedelta(minutes=ACTIVE_VALID_MINUTES)
    price = latest_price(data)

    signal_data["id"] = signal_id(
        signal_data["market"],
        interval,
        signal_data["decision"],
        published_at.isoformat(),
    )
    signal_data["status"] = "ACTIVE"
    signal_data["published_at"] = published_at.isoformat()
    signal_data["valid_until"] = valid_until.isoformat()
    signal_data["valid_for_minutes"] = ACTIVE_VALID_MINUTES
    signal_data["latest_price"] = safe_float(price)
    signal_data["result"] = "OPEN"
    signal_data["display_decision"] = (
        "STRONG BUY" if signal_data["decision"] == "BUY" else "STRONG SELL"
    )
    signal_data["order_type"] = (
        "MARKET BUY" if signal_data["decision"] == "BUY" else "MARKET SELL"
    )
    signal_data["strategy_votes"] = serialize_strategy_votes(signal_data.get("strategy_votes", {}))
    signal_data["entry"] = safe_float(signal_data.get("entry"))
    signal_data["stop_loss"] = safe_float(signal_data.get("stop_loss", signal_data.get("stoploss")))
    signal_data["stoploss"] = signal_data["stop_loss"]
    signal_data["tp1"] = safe_float(signal_data.get("tp1"))
    signal_data["tp2"] = safe_float(signal_data.get("tp2"))
    signal_data["tp3"] = safe_float(signal_data.get("tp3"))
    signal_data["tp1_hit"] = False
    signal_data["tp2_hit"] = False
    signal_data["tp3_hit"] = False

    return signal_data


def create_pending(signal_data, data, interval):
    votes = serialize_strategy_votes(signal_data.get("strategy_votes", {}))
    bias, score, opposite_score, reasons = score_bias(votes)

    if bias == "WAIT" or score < 30 or score <= opposite_score + 5:
        return None

    price = latest_price(data)
    if price is None:
        return None

    a = atr(data)
    published_at = now_utc()
    valid_until = published_at + timedelta(minutes=PENDING_VALID_MINUTES)
    confidence = min(90, score + 24)

    if confidence < MIN_PENDING_CONFIDENCE:
        return None

    if bias == "BUY":
        trigger = price + a * 0.20
        sl = price - a * 0.55
        tp1 = trigger + a * 1.80
        tp2 = trigger + a * 3.00
        tp3 = trigger + a * 4.50
        display = "PENDING BUY"
        order_type = "BUY STOP"
    else:
        trigger = price - a * 0.20
        sl = price + a * 0.55
        tp1 = trigger - a * 1.80
        tp2 = trigger - a * 3.00
        tp3 = trigger - a * 4.50
        display = "PENDING SELL"
        order_type = "SELL STOP"

    rr_to_tp1 = None
    risk_size = abs(trigger - sl)
    reward_size = abs(tp1 - trigger)
    if risk_size > 0:
        rr_to_tp1 = reward_size / risk_size

    return {
        "id": signal_id(signal_data["market"], interval, bias, published_at.isoformat()),
        "market": signal_data["market"],
        "timeframe": interval,
        "status": "PENDING",
        "display_decision": display,
        "order_type": order_type,
        "bias": bias,
        "trigger_price": safe_float(trigger),
        "entry": safe_float(trigger),
        "latest_price": safe_float(price),
        "stop_loss": safe_float(sl),
        "stoploss": safe_float(sl),
        "tp1": safe_float(tp1),
        "tp2": safe_float(tp2),
        "tp3": safe_float(tp3),
        "confidence": confidence,
        "risk": "TIGHT",
        "rr_to_tp1": safe_float(rr_to_tp1),
        "published_at": published_at.isoformat(),
        "valid_until": valid_until.isoformat(),
        "valid_for_minutes": PENDING_VALID_MINUTES,
        "reasons": reasons if reasons else ["possible setup forming"],
        "result": "WAITING_TRIGGER",
        "invalidation": "Pending order invalid after expiry or stop loss hit.",
        "strategy_votes": votes,
        "tp1_hit": False,
        "tp2_hit": False,
        "tp3_hit": False,
    }


def upsert_active_signal(active):
    same_market = [
        key for key, old in ACTIVE_SIGNALS.items()
        if old.get("market") == active.get("market")
    ]

    for key in same_market:
        old = ACTIVE_SIGNALS[key]
        if quality_rank(active) > quality_rank(old):
            old["status"] = "REPLACED"
            old["result"] = "REPLACED_BY_BETTER_SIGNAL"
            del ACTIVE_SIGNALS[key]
        else:
            return

    ACTIVE_SIGNALS[active["id"]] = active


def upsert_pending_order(order):
    same_market = [
        key for key, old in PENDING_ORDERS.items()
        if old.get("market") == order.get("market")
    ]

    for key in same_market:
        old = PENDING_ORDERS[key]
        if quality_rank(order) > quality_rank(old):
            close_signal(old, "PENDING_REPLACED_BY_BETTER_ORDER", old.get("latest_price"))
            del PENDING_ORDERS[key]
        else:
            return

    PENDING_ORDERS[order["id"]] = order


def update_signal_results(price_map):
    now = now_utc()

    for key in list(ACTIVE_SIGNALS.keys()):
        signal = ACTIVE_SIGNALS[key]
        market = signal["market"]
        price = price_map.get(market)

        if price is None:
            continue

        signal["latest_price"] = safe_float(price)

        if now > parse_time(signal.get("valid_until")):
            signal["status"] = "EXPIRED"
            signal["result"] = signal.get("result") or "EXPIRED"
            continue

        if signal.get("status") in ["STOPPED", "CLOSED"]:
            continue

        decision = signal["decision"]
        sl = signal["stop_loss"]
        tp1 = signal.get("tp1")
        tp2 = signal.get("tp2")
        tp3 = signal.get("tp3")

        if decision == "BUY":
            if sl is not None and price <= sl:
                signal["status"] = "STOPPED"
                signal["result"] = "STOP_LOSS_HIT"
                close_signal(dict(signal), "STOP_LOSS_HIT", price)
                del ACTIVE_SIGNALS[key]
                continue
            if tp1 is not None and price >= tp1:
                signal["tp1_hit"] = True
                signal["result"] = "TP1_REACHED"
            if tp2 is not None and price >= tp2:
                signal["tp2_hit"] = True
                signal["result"] = "TP2_REACHED"
            if tp3 is not None and price >= tp3:
                signal["tp3_hit"] = True
                signal["result"] = "TP3_REACHED"
                signal["status"] = "RUNNER"

        if decision == "SELL":
            if sl is not None and price >= sl:
                signal["status"] = "STOPPED"
                signal["result"] = "STOP_LOSS_HIT"
                close_signal(dict(signal), "STOP_LOSS_HIT", price)
                del ACTIVE_SIGNALS[key]
                continue
            if tp1 is not None and price <= tp1:
                signal["tp1_hit"] = True
                signal["result"] = "TP1_REACHED"
            if tp2 is not None and price <= tp2:
                signal["tp2_hit"] = True
                signal["result"] = "TP2_REACHED"
            if tp3 is not None and price <= tp3:
                signal["tp3_hit"] = True
                signal["result"] = "TP3_REACHED"
                signal["status"] = "RUNNER"

    for key in list(PENDING_ORDERS.keys()):
        order = PENDING_ORDERS[key]
        market = order["market"]
        price = price_map.get(market)

        if price is None:
            continue

        order["latest_price"] = safe_float(price)

        if now > parse_time(order.get("valid_until")):
            close_signal(order, "PENDING_EXPIRED", price)
            del PENDING_ORDERS[key]
            continue

        if order["bias"] == "BUY" and price >= order["trigger_price"]:
            active = {
                "id": order["id"],
                "market": order["market"],
                "timeframe": order["timeframe"],
                "decision": "BUY",
                "display_decision": "STRONG BUY",
                "signal_quality": "STRONG BUY",
                "entry": order["trigger_price"],
                "stop_loss": order["stop_loss"],
                "stoploss": order["stop_loss"],
                "tp1": order["tp1"],
                "tp2": order["tp2"],
                "tp3": order["tp3"],
                "confidence": order["confidence"],
                "risk": "TIGHT",
                "rr_to_tp1": order.get("rr_to_tp1"),
                "reasons": order["reasons"],
                "strategy_votes": order.get("strategy_votes", {}),
                "invalidation": "Invalid if price hits stop loss.",
                "status": "ACTIVE",
                "published_at": now.isoformat(),
                "valid_until": (now + timedelta(minutes=ACTIVE_VALID_MINUTES)).isoformat(),
                "valid_for_minutes": ACTIVE_VALID_MINUTES,
                "latest_price": safe_float(price),
                "result": "OPEN",
                "order_type": "TRIGGERED BUY",
                "tp1_hit": False,
                "tp2_hit": False,
                "tp3_hit": False,
            }
            upsert_active_signal(active)
            del PENDING_ORDERS[key]

        elif order["bias"] == "SELL" and price <= order["trigger_price"]:
            active = {
                "id": order["id"],
                "market": order["market"],
                "timeframe": order["timeframe"],
                "decision": "SELL",
                "display_decision": "STRONG SELL",
                "signal_quality": "STRONG SELL",
                "entry": order["trigger_price"],
                "stop_loss": order["stop_loss"],
                "stoploss": order["stop_loss"],
                "tp1": order["tp1"],
                "tp2": order["tp2"],
                "tp3": order["tp3"],
                "confidence": order["confidence"],
                "risk": "TIGHT",
                "rr_to_tp1": order.get("rr_to_tp1"),
                "reasons": order["reasons"],
                "strategy_votes": order.get("strategy_votes", {}),
                "invalidation": "Invalid if price hits stop loss.",
                "status": "ACTIVE",
                "published_at": now.isoformat(),
                "valid_until": (now + timedelta(minutes=ACTIVE_VALID_MINUTES)).isoformat(),
                "valid_for_minutes": ACTIVE_VALID_MINUTES,
                "latest_price": safe_float(price),
                "result": "OPEN",
                "order_type": "TRIGGERED SELL",
                "tp1_hit": False,
                "tp2_hit": False,
                "tp3_hit": False,
            }
            upsert_active_signal(active)
            del PENDING_ORDERS[key]


@app.get("/")
def home():
    return {
        "status": "online",
        "message": "EasyPips balanced performance engine running",
        "markets": list(SYMBOLS.keys()),
    }


@app.get("/health")
def health():
    return {"status": "online"}


@app.get("/signal-book")
def signal_book():
    cleanup_books()

    active = sorted(ACTIVE_SIGNALS.values(), key=quality_rank, reverse=True)
    pending = sorted(PENDING_ORDERS.values(), key=quality_rank, reverse=True)

    return {
        "top_trade": active[0] if active else None,
        "top_pending": pending[0] if pending else None,
        "active": active,
        "pending": pending,
        "closed": CLOSED_SIGNALS[:50],
        "summary": {
            "active_count": len(active),
            "pending_count": len(pending),
            "closed_count": len(CLOSED_SIGNALS),
            "updated_at": now_utc().isoformat(),
            "min_active_confidence": MIN_ACTIVE_CONFIDENCE,
            "min_pending_confidence": MIN_PENDING_CONFIDENCE,
            "mode": "BALANCED_PERFORMANCE",
        },
    }


@app.get("/pro-signals")
def pro_signals(interval: str = "5m"):
    latest_scan = {}
    price_map = {}

    cleanup_books()

    for market in SYMBOLS.keys():
        try:
            data = get_market_data(market, interval)

            if data is None:
                latest_scan[market] = {
                    "market": market,
                    "decision": "WAIT",
                    "display_decision": "NO DATA",
                    "latest_price": None,
                    "reasons": ["No market data returned."],
                    "strategy_votes": {},
                    "tp1_hit": False,
                    "tp2_hit": False,
                    "tp3_hit": False,
                }
                continue

            price = latest_price(data)
            price_map[market] = safe_float(price)

            engine = EasyPipsEngine(market, data, interval)
            signal = engine.analyze()
            signal_data = signal.__dict__ if hasattr(signal, "__dict__") else dict(signal)
            signal_data = decorate_scan_signal(signal_data, price)

            latest_scan[market] = signal_data

            if signal_data.get("decision") in ["BUY", "SELL"]:
                if signal_data.get("confidence", 0) >= MIN_ACTIVE_CONFIDENCE:
                    active = decorate_active(dict(signal_data), data, interval)
                    upsert_active_signal(active)
                else:
                    order = create_pending(dict(signal_data), data, interval)
                    if order:
                        upsert_pending_order(order)

        except Exception as e:
            latest_scan[market] = {
                "market": market,
                "decision": "WAIT",
                "display_decision": "NO SIGNAL",
                "latest_price": None,
                "reasons": [str(e)],
                "strategy_votes": {},
                "tp1_hit": False,
                "tp2_hit": False,
                "tp3_hit": False,
            }

    update_signal_results(price_map)
    cleanup_books()

    active = sorted(ACTIVE_SIGNALS.values(), key=quality_rank, reverse=True)
    pending = sorted(PENDING_ORDERS.values(), key=quality_rank, reverse=True)

    return {
        "pair_prices": price_map,
        "latest_scan": latest_scan,
        "top_trade": active[0] if active else None,
        "top_pending": pending[0] if pending else None,
        "active": active,
        "pending": pending,
        "closed": CLOSED_SIGNALS[:50],
        "summary": {
            "active_count": len(active),
            "pending_count": len(pending),
            "closed_count": len(CLOSED_SIGNALS),
            "updated_at": now_utc().isoformat(),
            "min_active_confidence": MIN_ACTIVE_CONFIDENCE,
            "min_pending_confidence": MIN_PENDING_CONFIDENCE,
            "mode": "BALANCED_PERFORMANCE",
        },
    }