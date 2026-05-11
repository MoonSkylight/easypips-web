from dataclasses import dataclass
import pandas as pd


@dataclass
class Signal:
    market: str
    timeframe: str
    decision: str
    signal_quality: str
    entry: float | None
    stop_loss: float | None
    tp1: float | None
    tp2: float | None
    tp3: float | None
    confidence: int
    risk: str
    rr_to_tp1: float | None
    spread_warning: str
    news_warning: str
    reasons: list
    strategy_votes: dict
    invalidation: str


class EasyPipsEngine:
    def __init__(self, market, df, timeframe="5m"):
        self.market = market
        self.df = df.copy()
        self.timeframe = timeframe
        self.prepare()

    def prepare(self):
        self.df.columns = [c.lower() for c in self.df.columns]
        self.df = self.df.dropna()

        self.df["ema9"] = self.df["close"].ewm(span=9).mean()
        self.df["ema21"] = self.df["close"].ewm(span=21).mean()
        self.df["ema50"] = self.df["close"].ewm(span=50).mean()

        typical = (self.df["high"] + self.df["low"] + self.df["close"]) / 3
        self.df["vwap"] = typical.cumsum() / self.df["volume"].cumsum()

        delta = self.df["close"].diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, 1)
        self.df["rsi"] = 100 - (100 / (1 + rs))

    def latest(self):
        return self.df.iloc[-1]

    def atr(self):
        return float((self.df["high"] - self.df["low"]).rolling(14).mean().iloc[-1])

    def trend(self):
        c = self.latest()

        if c["ema9"] > c["ema21"] > c["ema50"]:
            return "BUY", 30

        if c["ema9"] < c["ema21"] < c["ema50"]:
            return "SELL", 30

        return "WAIT", 0

    def vwap(self):
        c = self.latest()

        if c["close"] > c["vwap"]:
            return "BUY", 15

        if c["close"] < c["vwap"]:
            return "SELL", 15

        return "WAIT", 0

    def candle(self):
        c = self.latest()

        body = abs(c["close"] - c["open"])
        rng = c["high"] - c["low"]

        if rng == 0:
            return "WAIT", 0

        if body / rng > 0.5:
            if c["close"] > c["open"]:
                return "BUY", 20
            else:
                return "SELL", 20

        return "WAIT", 0

    def rsi(self):
        r = self.latest()["rsi"]

        if 45 <= r <= 65:
            return "BUY", 10

        if 35 <= r <= 55:
            return "SELL", 10

        return "WAIT", 0

    def levels(self, decision):
        c = self.latest()
        price = float(c["close"])
        atr = self.atr()

        if decision == "BUY":
            return (
                price,
                price - atr * 1.1,
                price + atr * 1.0,
                price + atr * 1.8,
                price + atr * 2.8,
            )

        if decision == "SELL":
            return (
                price,
                price + atr * 1.1,
                price - atr * 1.0,
                price - atr * 1.8,
                price - atr * 2.8,
            )

        return None, None, None, None, None

    def analyze(self):
        votes = {
            "trend": self.trend(),
            "vwap": self.vwap(),
            "candle": self.candle(),
            "rsi": self.rsi(),
        }

        buy_score = sum(v[1] for v in votes.values() if v[0] == "BUY")
        sell_score = sum(v[1] for v in votes.values() if v[0] == "SELL")

        buy_count = sum(1 for v in votes.values() if v[0] == "BUY")
        sell_count = sum(1 for v in votes.values() if v[0] == "SELL")

        decision = "WAIT"
        confidence = 50

        if buy_count >= 3 and buy_score >= 65 and buy_score > sell_score + 15:
            decision = "BUY"
            confidence = min(95, buy_score + 10)

        elif sell_count >= 3 and sell_score >= 65 and sell_score > buy_score + 15:
            decision = "SELL"
            confidence = min(95, sell_score + 10)

        entry, sl, tp1, tp2, tp3 = self.levels(decision)

        return Signal(
            market=self.market,
            timeframe=self.timeframe,
            decision=decision,
            signal_quality="STRONG " + decision if decision != "WAIT" else "NO SIGNAL",
            entry=entry,
            stop_loss=sl,
            tp1=tp1,
            tp2=tp2,
            tp3=tp3,
            confidence=confidence,
            risk="LOW" if confidence >= 80 else "HIGH",
            rr_to_tp1=None,
            spread_warning="",
            news_warning="",
            reasons=[],
            strategy_votes=votes,
            invalidation="",
        )