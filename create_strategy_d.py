from pathlib import Path

code = r'''
import pandas as pd


def _rsi(close, period=14):
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def _atr(data, period=14):
    high_low = data["High"] - data["Low"]
    high_close = (data["High"] - data["Close"].shift()).abs()
    low_close = (data["Low"] - data["Close"].shift()).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    return tr.rolling(period).mean()


def _resample(data, rule):
    return data.resample(rule).agg({
        "Open": "first",
        "High": "max",
        "Low": "min",
        "Close": "last",
        "Volume": "sum",
    }).dropna()






def generate_strategy_d_signal(data_1m, symbol):
    if data_1m is None or data_1m.empty or len(data_1m) < 120:
        return None

    data = data_1m.copy().dropna()

    data_3m = _resample(data, "3min")
    data_15m = _resample(data, "15min")

 










   if len(data_3m) < 50 or len(data_15m) < 50:
        return None

    close15 = data_15m["Close"]
    ema20_15 = close15.ewm(span=20, adjust=False).mean()
    ema50_15 = close15.ewm(span=50, adjust=False).mean()

    close3 = data_3m["Close"]
    ema9 = close3.ewm(span=9, adjust=False).mean()
    ema21 = close3.ewm(span=21, adjust=False).mean()
    rsi = _rsi(close3)
    atr = _atr(data_3m)

    latest = data_3m.iloc[-1]
    previous = data_3m.iloc[-2]
















    price = float(latest["Close"])
    atr_now = float(atr.iloc[-1]) if pd.notna(atr.iloc[-1]) else 0
    rsi_now = float(rsi.iloc[-1]) if pd.notna(rsi.iloc[-1]) else 50

    if atr_now <= 0:
        return None

    bullish_15m = close15.iloc[-1] > ema50_15.iloc[-1] and ema20_15.iloc[-1] > ema50_15.iloc[-1]
    bearish_15m = close15.iloc[-1] < ema50_15.iloc[-1] and ema20_15.iloc[-1] < ema50_15.iloc[-1]










    bullish_3m = ema9.iloc[-1] > ema21.iloc[-1]
    bearish_3m = ema9.iloc[-1] < ema21.iloc[-1]

    bullish_close = latest["Close"] > latest["Open"]
    bearish_close = latest["Close"] < latest["Open"]








    near_ema_buy = latest["Low"] <= max(ema9.iloc[-1], ema21.iloc[-1])
    near_ema_sell = latest["High"] >= min(ema9.iloc[-1], ema21.iloc[-1])

    if bullish_15m and bullish_3m and near_ema_buy and bullish_close and 50 <= rsi_now <= 65:
        entry = price
 





       sl = entry - (atr_now * 1.2)
        risk = entry - sl
        return {
            "strategy": "Strategy D",
            "pattern": "3m_scalping_buy",
            "timeframe": "3m",
 





           "direction": "BUY",
            "entry": round(entry, 5),
            "sl": round(sl, 5),
            "tp1": round(entry + risk, 5),
            "tp2": round(entry + risk * 1.5, 5),
 




           "tp3": round(entry + risk * 2, 5),
            "confidence": 88,
            "score": 88,
            "reason": f"3m scalping BUY: 15m trend bullish, EMA9/21 aligned, RSI {round(rsi_now, 2)}",
 



       }

    if bearish_15m and bearish_3m and near_ema_sell and bearish_close and 35 <= rsi_now <= 50:
        entry = price
 



       sl = entry + (atr_now * 1.2)
        risk = sl - entry
        return {
            "strategy": "Strategy D",
 



           "pattern": "3m_scalping_sell",
            "timeframe": "3m",
            "direction": "SELL",
 


           "entry": round(entry, 5),
            "sl": round(sl, 5),
            "tp1": round(entry - risk, 5),
 


           "tp2": round(entry - risk * 1.5, 5),
            "tp3": round(entry - risk * 2, 5),
            "confidence": 88,
 


           "score": 88,
            "reason": f"3m scalping SELL: 15m trend bearish, EMA9/21 aligned, RSI {round(rsi_now, 2)}",
 

       }

    return None
'


''

P

ath("strategy_d.py").write_text(code, encoding="utf-8")
