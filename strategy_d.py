import pandas as pd
import numpy as np

MIN_RR = 2.0


def _atr(df, period=14):
    tr = pd.concat([
        df["High"] - df["Low"],
        (df["High"] - df["Close"].shift()).abs(),
        (df["Low"] - df["Close"].shift()).abs(),
    ], axis=1).max(axis=1)
    return tr.rolling(period).mean()


def _rsi(close, period=14):
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def _resample(df, rule):
    return df.resample(rule).agg({
        "Open": "first",
        "High": "max",
        "Low": "min",
        "Close": "last",
        "Volume": "sum",
    }).dropna()


def generate_strategy_d_signal(df, symbol="UNKNOWN"):
    if df is None or df.empty or len(df) < 240:
        return None

    df = df.dropna().copy()

    if not isinstance(df.index, pd.DatetimeIndex):
        return None

    data_3m = _resample(df, "3min")
    data_15m = _resample(df, "15min")

    if len(data_3m) < 80 or len(data_15m) < 60:
        return None

    close15 = data_15m["Close"]
    ema20_15 = close15.ewm(span=20, adjust=False).mean()
    ema50_15 = close15.ewm(span=50, adjust=False).mean()

    trend_buy = close15.iloc[-1] > ema50_15.iloc[-1] and ema20_15.iloc[-1] > ema50_15.iloc[-1]
    trend_sell = close15.iloc[-1] < ema50_15.iloc[-1] and ema20_15.iloc[-1] < ema50_15.iloc[-1]

    close3 = data_3m["Close"]
    ema9 = close3.ewm(span=9, adjust=False).mean()
    ema21 = close3.ewm(span=21, adjust=False).mean()
    rsi = _rsi(close3)
    atr = _atr(data_3m)

    row = data_3m.iloc[-1]
    prev = data_3m.iloc[-8:-1]

    entry = float(row["Close"])
    atr_now = float(atr.iloc[-1]) if np.isfinite(atr.iloc[-1]) else 0
    rsi_now = float(rsi.iloc[-1]) if np.isfinite(rsi.iloc[-1]) else 50

    if atr_now <= 0:
        return None

    bullish_close = row["Close"] > row["Open"]
    bearish_close = row["Close"] < row["Open"]

    ema_buy = ema9.iloc[-1] > ema21.iloc[-1]
    ema_sell = ema9.iloc[-1] < ema21.iloc[-1]

    pullback_buy = row["Low"] <= max(ema9.iloc[-1], ema21.iloc[-1])
    pullback_sell = row["High"] >= min(ema9.iloc[-1], ema21.iloc[-1])

    swept_low = float(row["Low"]) < float(prev["Low"].min()) and float(row["Close"]) > float(prev["Low"].min())
    swept_high = float(row["High"]) > float(prev["High"].max()) and float(row["Close"]) < float(prev["High"].max())

    if trend_buy and ema_buy and pullback_buy and bullish_close and swept_low and 50 <= rsi_now <= 65:
        sl = entry - (atr_now * 1.2)
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
            "tp2": round(entry + risk * 1.5, 5),
            "tp3": round(entry + risk * 2, 5),
            "rr": 2,
            "confidence": 88,
            "score": 88,
            "pattern": "3m_scalping_liquidity_buy",
            "timeframe": "3m",
        }

    if trend_sell and ema_sell and pullback_sell and bearish_close and swept_high and 35 <= rsi_now <= 50:
        sl = entry + (atr_now * 1.2)
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
            "tp2": round(entry - risk * 1.5, 5),
            "tp3": round(entry - risk * 2, 5),
            "rr": 2,
            "confidence": 88,
            "score": 88,
            "pattern": "3m_scalping_liquidity_sell",
            "timeframe": "3m",
        }

    return None