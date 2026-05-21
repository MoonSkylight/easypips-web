import pandas as pd
import numpy as np

MIN_RR = 2.5

def generate_strategy_d_signal(df, symbol="UNKNOWN"):
    if df is None or df.empty or len(df) < 220:
        return None

    df = df.dropna().copy()

    if not isinstance(df.index, pd.DatetimeIndex):
        return None

    hourly = df.resample("1h").agg({
        "Open": "first",
        "High": "max",
        "Low": "min",
        "Close": "last",
    }).dropna()

    if len(hourly) < 80:
        return None

    ema50 = hourly["Close"].ewm(span=50, adjust=False).mean().iloc[-1]
    ema200 = hourly["Close"].ewm(span=200, adjust=False).mean().iloc[-1]

    bias = None

    if ema50 > ema200:
        bias = "BUY"

    if ema50 < ema200:
        bias = "SELL"

    if bias is None:
        return None

    row = df.iloc[-1]
    prev = df.iloc[-12:-1]

    entry = float(row["Close"])

    atr = (
        pd.concat([
            df["High"] - df["Low"],
            (df["High"] - df["Close"].shift()).abs(),
            (df["Low"] - df["Close"].shift()).abs(),
        ], axis=1)
        .max(axis=1)
        .rolling(14)
        .mean()
        .iloc[-1]
    )

    if not np.isfinite(atr) or atr <= 0:
        return None

    body = abs(float(row["Close"]) - float(row["Open"]))

    if body < atr * 0.8:
        return None

    swept_low = (
        float(row["Low"]) < float(prev["Low"].min())
        and float(row["Close"]) > float(prev["Low"].min())
    )

    swept_high = (
        float(row["High"]) > float(prev["High"].max())
        and float(row["Close"]) < float(prev["High"].max())
    )

    if bias == "BUY" and swept_low:
        sl = float(row["Low"]) - atr * 0.15
        risk = entry - sl

        if risk <= 0:
            return None

        return {
            "strategy": "Strategy D",
            "symbol": symbol,
            "direction": "BUY",
            "entry": round(entry, 5),
            "sl": round(sl, 5),
            "tp1": round(entry + risk, 5),
            "tp2": round(entry + risk * 2, 5),
            "tp3": round(entry + risk * 3, 5),
            "rr": 3,
            "confidence": 93,
            "pattern": "institutional_liquidity_scalper_buy",
            "timeframe": "15m",
        }

    if bias == "SELL" and swept_high:
        sl = float(row["High"]) + atr * 0.15
        risk = sl - entry

        if risk <= 0:
            return None

        return {
            "strategy": "Strategy D",
            "symbol": symbol,
            "direction": "SELL",
            "entry": round(entry, 5),
            "sl": round(sl, 5),
            "tp1": round(entry - risk, 5),
            "tp2": round(entry - risk * 2, 5),
            "tp3": round(entry - risk * 3, 5),
            "rr": 3,
            "confidence": 93,
            "pattern": "institutional_liquidity_scalper_sell",
            "timeframe": "15m",
        }

    return None