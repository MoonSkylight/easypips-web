# strategy_c.py
# EasyPips Strategy C
# Smart Money / ICT High RR Scanner
# Version 1 Architecture

import pandas as pd
import numpy as np


# =========================================================
# SETTINGS
# =========================================================

MIN_RR = 5
MAX_SL_PIPS = 30
ASIAN_SESSION_START = 0
ASIAN_SESSION_END = 6


# =========================================================
# SWING STRUCTURE
# =========================================================

def detect_swings(df, lookback=3):
    swings = []

    for i in range(lookback, len(df) - lookback):
        high = df["High"].iloc[i]
        low = df["Low"].iloc[i]

        if high == max(df["High"].iloc[i - lookback:i + lookback + 1]):
            swings.append({
                "type": "HH",
                "index": i,
                "price": high
            })

        if low == min(df["Low"].iloc[i - lookback:i + lookback + 1]):
            swings.append({
                "type": "LL",
                "index": i,
                "price": low
            })

    return swings


# =========================================================
# ASIAN RANGE
# =========================================================

def detect_asian_range(df):
    asian = df[
        (df.index.hour >= ASIAN_SESSION_START) &
        (df.index.hour <= ASIAN_SESSION_END)
    ]

    if len(asian) == 0:
        return None

    return {
        "high": asian["High"].max(),
        "low": asian["Low"].min()
    }


# =========================================================
# LIQUIDITY SWEEP
# =========================================================

def detect_liquidity_sweep(df, asian_range):
    last = df.iloc[-1]

    sweep_high = last["High"] > asian_range["high"]
    rejection_high = last["Close"] < asian_range["high"]

    sweep_low = last["Low"] < asian_range["low"]
    rejection_low = last["Close"] > asian_range["low"]

    return {
        "buy_side_liquidity_taken": sweep_high and rejection_high,
        "sell_side_liquidity_taken": sweep_low and rejection_low
    }


# =========================================================
# BREAK OF STRUCTURE
# =========================================================

def detect_bos(df):
    recent_high = df["High"].iloc[-10:-1].max()
    recent_low = df["Low"].iloc[-10:-1].min()

    last_close = df["Close"].iloc[-1]

    bullish_bos = last_close > recent_high
    bearish_bos = last_close < recent_low

    return {
        "bullish_bos": bullish_bos,
        "bearish_bos": bearish_bos
    }


# =========================================================
# SUPPLY / DEMAND ZONES
# =========================================================

def detect_supply_demand_zone(df):
    recent = df.tail(20)

    impulse_up = recent["Close"].iloc[-1] > recent["Open"].iloc[0]
    impulse_down = recent["Close"].iloc[-1] < recent["Open"].iloc[0]

    if impulse_up:
        return {
            "type": "demand",
            "zone_low": recent["Low"].min(),
            "zone_high": recent["Close"].min()
        }

    if impulse_down:
        return {
            "type": "supply",
            "zone_low": recent["Close"].max(),
            "zone_high": recent["High"].max()
        }

    return None


# =========================================================
# QM / FAKEOUT
# =========================================================

def detect_qm_fakeout(df):
    highs = df["High"].tail(10).values
    lows = df["Low"].tail(10).values

    if len(highs) < 5:
        return None

    fakeout_sell = highs[-1] > highs[-2] and df["Close"].iloc[-1] < highs[-2]
    fakeout_buy = lows[-1] < lows[-2] and df["Close"].iloc[-1] > lows[-2]

    return {
        "fakeout_sell": fakeout_sell,
        "fakeout_buy": fakeout_buy
    }


# =========================================================
# RR CALCULATION
# =========================================================

def calculate_rr(entry, sl, tp):
    risk = abs(entry - sl)

    if risk == 0:
        return 0

    reward = abs(tp - entry)

    return round(reward / risk, 2)


# =========================================================
# STRATEGY C SIGNAL ENGINE
# =========================================================

def generate_strategy_c_signal(df, symbol="UNKNOWN"):
    asian = detect_asian_range(df)

    if not asian:
        return None

    sweep = detect_liquidity_sweep(df, asian)
    bos = detect_bos(df)
    zone = detect_supply_demand_zone(df)
    qm = detect_qm_fakeout(df)

    last_close = df["Close"].iloc[-1]

    # -----------------------------------------------------
    # SELL SETUP
    # -----------------------------------------------------

    if (
        sweep["buy_side_liquidity_taken"]
        and bos["bearish_bos"]
        and qm["fakeout_sell"]
        and zone
        and zone["type"] == "supply"
    ):

        entry = last_close
        sl = zone["zone_high"]

        tp = entry - ((sl - entry) * 10)

        rr = calculate_rr(entry, sl, tp)

        if rr >= MIN_RR:

            return {
                "strategy": "Strategy C",
                "symbol": symbol,
                "direction": "SELL",
                "entry": round(entry, 5),
                "sl": round(sl, 5),
                "tp1": round(tp, 5),
                "rr": rr,
                "confidence": 92,
                "reason": "Supply + BOS + Liquidity Sweep + QM"
            }

    # -----------------------------------------------------
    # BUY SETUP
    # -----------------------------------------------------

    if (
        sweep["sell_side_liquidity_taken"]
        and bos["bullish_bos"]
        and qm["fakeout_buy"]
        and zone
        and zone["type"] == "demand"
    ):

        entry = last_close
        sl = zone["zone_low"]

        tp = entry + ((entry - sl) * 10)

        rr = calculate_rr(entry, sl, tp)

        if rr >= MIN_RR:

            return {
                "strategy": "Strategy C",
                "symbol": symbol,
                "direction": "BUY",
                "entry": round(entry, 5),
                "sl": round(sl, 5),
                "tp1": round(tp, 5),
                "rr": rr,
                "confidence": 92,
                "reason": "Demand + BOS + Liquidity Sweep + QM"
            }

    return None