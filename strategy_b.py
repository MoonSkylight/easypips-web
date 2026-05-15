from dataclasses import dataclass, asdict
from typing import Optional
import pandas as pd
import numpy as np


@dataclass
class Trade:
    side: str
    entry_time: pd.Timestamp
    entry: float
    stop: float
    tp1: float
    final_target: float
    rr: float
    risk_per_unit: float
    moved_to_be: bool = False
    tp1_hit: bool = False
    partial_size: float = 0.7
    exit_time: Optional[pd.Timestamp] = None
    exit_price: Optional[float] = None
    result_r: Optional[float] = None
    reason: Optional[str] = None


class AdvancedSniperSMCStrategy:
    def __init__(
        self,
        swing_lookback: int = 2,
        atr_period: int = 14,
        stop_padding_atr: float = 0.03,
        zone_padding_atr: float = 0.03,
        displacement_atr_mult: float = 1.4,
        confirmation_body_atr: float = 0.5,
        sweep_lookback: int = 8,
        choch_lookback: int = 20,
        session_mode: str = "london_ny",
        min_rr: float = 10.0,
        tp1_rr: float = 5.0,
        partial_size: float = 0.7,
        max_holding_bars: int = 96,
        cooldown_bars: int = 8,
    ):
        self.swing_lookback = swing_lookback
        self.atr_period = atr_period
        self.stop_padding_atr = stop_padding_atr
        self.zone_padding_atr = zone_padding_atr
        self.displacement_atr_mult = displacement_atr_mult
        self.confirmation_body_atr = confirmation_body_atr
        self.sweep_lookback = sweep_lookback
        self.choch_lookback = choch_lookback
        self.session_mode = session_mode
        self.min_rr = min_rr
        self.tp1_rr = tp1_rr
        self.partial_size = partial_size
        self.max_holding_bars = max_holding_bars
        self.cooldown_bars = cooldown_bars

    def prepare(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        req = {"Open", "High", "Low", "Close"}
        if not req.issubset(df.columns):
            raise ValueError(f"DataFrame must contain columns: {req}")

        if not isinstance(df.index, pd.DatetimeIndex):
            raise ValueError("DataFrame index must be a DatetimeIndex")

        tr1 = df["High"] - df["Low"]
        tr2 = (df["High"] - df["Close"].shift()).abs()
        tr3 = (df["Low"] - df["Close"].shift()).abs()

        df["TR"] = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        df["ATR"] = df["TR"].rolling(self.atr_period).mean()
        df["body"] = (df["Close"] - df["Open"]).abs()

        n = self.swing_lookback
        df["swing_high"] = (
            df["High"].rolling(2 * n + 1, center=True).max() == df["High"]
        )
        df["swing_low"] = (
            df["Low"].rolling(2 * n + 1, center=True).min() == df["Low"]
        )

        df["bull_displacement"] = (
            (df["Close"] > df["Open"])
            & (df["body"] > df["ATR"] * self.displacement_atr_mult)
        )
        df["bear_displacement"] = (
            (df["Close"] < df["Open"])
            & (df["body"] > df["ATR"] * self.displacement_atr_mult)
        )
        df["bull_confirm"] = (
            (df["Close"] > df["Open"])
            & (df["body"] > df["ATR"] * self.confirmation_body_atr)
        )
        df["bear_confirm"] = (
            (df["Close"] < df["Open"])
            & (df["body"] > df["ATR"] * self.confirmation_body_atr)
        )

        df["hour_utc"] = df.index.hour
        df["in_london"] = (df["hour_utc"] >= 7) & (df["hour_utc"] < 11)
        df["in_ny"] = (df["hour_utc"] >= 12) & (df["hour_utc"] < 16)
        df["in_london_ny"] = df["in_london"] | df["in_ny"]

        return df

    def session_ok(self, row: pd.Series) -> bool:
        if self.session_mode == "all":
            return True
        if self.session_mode == "london":
            return bool(row["in_london"])
        if self.session_mode == "ny":
            return bool(row["in_ny"])
        return bool(row["in_london_ny"])

    def liquidity_sweep(self, df: pd.DataFrame, i: int, side: str) -> bool:
        prev = df.iloc[max(0, i - self.sweep_lookback):i]
        if len(prev) < 3:
            return False

        row = df.iloc[i]

        if side == "long":
            return row["Low"] < prev["Low"].min() and row["Close"] > row["Low"]

        return row["High"] > prev["High"].max() and row["Close"] < row["High"]

    def choch_bos(self, df: pd.DataFrame, i: int, side: str) -> bool:
        prev = df.iloc[max(0, i - self.choch_lookback):i]
        if len(prev) < 5:
            return False

        row = df.iloc[i]

        if side == "long":
            recent_minor_high = prev["High"].tail(5).max()
            recent_low = prev["Low"].min()
            choch = row["Close"] > recent_minor_high
            protected_low = row["Low"] > recent_low
            return choch and protected_low

        recent_minor_low = prev["Low"].tail(5).min()
        recent_high = prev["High"].max()
        choch = row["Close"] < recent_minor_low
        protected_high = row["High"] < recent_high
        return choch and protected_high

    def find_order_block_zone(self, df: pd.DataFrame, i: int, side: str):
        start = max(0, i - 15)
        window = df.iloc[start:i]

        if len(window) < 5:
            return None

        if side == "long":
            base = window[window["Close"] < window["Open"]].tail(2)
        else:
            base = window[window["Close"] > window["Open"]].tail(2)

        if base.empty:
            return None

        zl = float(base["Low"].min())
        zh = float(base["High"].max())

        return zl, zh

    def premium_discount_ok(self, df: pd.DataFrame, i: int, side: str) -> bool:
        prev = df.iloc[max(0, i - 20):i]

        if len(prev) < 5:
            return False

        dealing_low = prev["Low"].min()
        dealing_high = prev["High"].max()
        eq = (dealing_high + dealing_low) / 2
        price = df.iloc[i]["Close"]

        if side == "long":
            return price <= eq

        return price >= eq

    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        df = self.prepare(df)
        signals = []
        meta = []

        warmup = max(30, self.atr_period + 5)

        for i in range(warmup, len(df)):
            row = df.iloc[i]
            atr = row["ATR"]

            if pd.isna(atr) or atr == 0 or not self.session_ok(row):
                signals.append(0)
                meta.append({})
                continue

            signal = 0
            info = {}

            if (
                self.liquidity_sweep(df, i, "long")
                and self.choch_bos(df, i, "long")
                and self.premium_discount_ok(df, i, "long")
            ):
                zone = self.find_order_block_zone(df, i, "long")
                if zone and row["bull_confirm"]:
                    zl, zh = zone
                    tapped = row["Low"] <= zh + atr * self.zone_padding_atr
                    reclaimed = row["Close"] > zh

                    if tapped and reclaimed:
                        signal = 1
                        info = {
                            "zone_low": zl,
                            "zone_high": zh,
                            "setup": "long",
                            "reason": "SMC long: sweep + CHoCH/BOS + discount + order block reclaim",
                        }

            if (
                signal == 0
                and self.liquidity_sweep(df, i, "short")
                and self.choch_bos(df, i, "short")
                and self.premium_discount_ok(df, i, "short")
            ):
                zone = self.find_order_block_zone(df, i, "short")
                if zone and row["bear_confirm"]:
                    zl, zh = zone
                    tapped = row["High"] >= zl - atr * self.zone_padding_atr
                    rejected = row["Close"] < zl

                    if tapped and rejected:
                        signal = -1
                        info = {
                            "zone_low": zl,
                            "zone_high": zh,
                            "setup": "short",
                            "reason": "SMC short: sweep + CHoCH/BOS + premium + order block rejection",
                        }

            signals.append(signal)
            meta.append(info)

        out = df.iloc[warmup:].copy()
        out["signal"] = signals
        out["meta"] = meta

        return out

    def latest_signal(self, df: pd.DataFrame, symbol: str = "UNKNOWN"):
        out = self.generate_signals(df)

        if out.empty:
            return None

        recent = out.tail(5)

        for idx in reversed(recent.index):
            row = recent.loc[idx]
            sig = int(row["signal"])

            if sig == 0:
                continue

            meta = row.get("meta") or {}
            atr = float(row["ATR"])
            entry = float(row["Close"])

            if sig == 1:
                direction = "BUY"
                sl = float(row["Low"] - atr * self.stop_padding_atr)
                risk = entry - sl
                if risk <= 0:
                    continue
                tp1 = entry + risk * self.tp1_rr
                tp2 = entry + risk * ((self.tp1_rr + self.min_rr) / 2)
                tp3 = entry + risk * self.min_rr

            else:
                direction = "SELL"
                sl = float(row["High"] + atr * self.stop_padding_atr)
                risk = sl - entry
                if risk <= 0:
                    continue
                tp1 = entry - risk * self.tp1_rr
                tp2 = entry - risk * ((self.tp1_rr + self.min_rr) / 2)
                tp3 = entry - risk * self.min_rr

            rr = round(abs(tp3 - entry) / abs(entry - sl), 2)

            return {
                "strategy": "Strategy B",
                "symbol": symbol,
                "direction": direction,
                "entry": round(entry, 5),
                "sl": round(sl, 5),
                "tp1": round(tp1, 5),
                "tp2": round(tp2, 5),
                "tp3": round(tp3, 5),
                "rr": rr,
                "confidence": 90 if rr >= self.min_rr else 80,
                "pattern": meta.get("reason", "Advanced Sniper SMC"),
                "timeframe": "15m",
            }

        return None

    def backtest(self, df: pd.DataFrame) -> tuple[pd.DataFrame, list[Trade]]:
        df = self.generate_signals(df)
        trades = []
        position = None
        cooldown = 0
        entry_i = 0

        for i in range(len(df)):
            row = df.iloc[i]

            if position is not None:
                hi, lo = float(row["High"]), float(row["Low"])
                bars_held = i - entry_i

                if position.side == "long":
                    if not position.tp1_hit and hi >= position.tp1:
                        position.tp1_hit = True
                        position.moved_to_be = True
                        position.stop = position.entry

                    stop_hit = lo <= position.stop
                    final_hit = hi >= position.final_target

                else:
                    if not position.tp1_hit and lo <= position.tp1:
                        position.tp1_hit = True
                        position.moved_to_be = True
                        position.stop = position.entry

                    stop_hit = hi >= position.stop
                    final_hit = lo <= position.final_target

                if final_hit:
                    partial_r = self.tp1_rr * position.partial_size
                    runner_r = self.min_rr * (1 - position.partial_size)
                    position.exit_price = position.final_target
                    position.result_r = partial_r + runner_r
                    position.reason = "tp1_and_final_target"

                elif stop_hit:
                    if position.tp1_hit:
                        partial_r = self.tp1_rr * position.partial_size
                        be_r = 0.0 * (1 - position.partial_size)
                        position.exit_price = position.stop
                        position.result_r = partial_r + be_r
                        position.reason = "tp1_then_breakeven"
                    else:
                        position.exit_price = position.stop
                        position.result_r = -1.0
                        position.reason = "full_stop"

                elif bars_held >= self.max_holding_bars:
                    exit_price = float(row["Close"])
                    pnl = (
                        exit_price - position.entry
                        if position.side == "long"
                        else position.entry - exit_price
                    )
                    raw_r = pnl / position.risk_per_unit if position.risk_per_unit else 0.0

                    if position.tp1_hit:
                        raw_r = (
                            self.tp1_rr * position.partial_size
                            + max(0.0, raw_r) * (1 - position.partial_size)
                        )

                    position.exit_price = exit_price
                    position.result_r = raw_r
                    position.reason = "time_exit"

                if position.reason is not None:
                    position.exit_time = df.index[i]
                    trades.append(position)
                    position = None
                    cooldown = self.cooldown_bars
                    continue

            if cooldown > 0:
                cooldown -= 1
                continue

            sig = int(row["signal"])
            atr = float(row["ATR"])

            if sig == 0 or np.isnan(atr) or atr <= 0:
                continue

            if sig == 1:
                entry = float(row["Close"])
                stop = float(row["Low"] - atr * self.stop_padding_atr)
                risk = entry - stop

                if risk <= 0:
                    continue

                tp1 = entry + risk * self.tp1_rr
                final_target = entry + risk * self.min_rr

                position = Trade(
                    "long",
                    df.index[i],
                    entry,
                    stop,
                    tp1,
                    final_target,
                    self.min_rr,
                    risk,
                    partial_size=self.partial_size,
                )
                entry_i = i

            elif sig == -1:
                entry = float(row["Close"])
                stop = float(row["High"] + atr * self.stop_padding_atr)
                risk = stop - entry

                if risk <= 0:
                    continue

                tp1 = entry - risk * self.tp1_rr
                final_target = entry - risk * self.min_rr

                position = Trade(
                    "short",
                    df.index[i],
                    entry,
                    stop,
                    tp1,
                    final_target,
                    self.min_rr,
                    risk,
                    partial_size=self.partial_size,
                )
                entry_i = i

        trades_df = pd.DataFrame([asdict(t) for t in trades]) if trades else pd.DataFrame()

        return trades_df, trades


def generate_strategy_b_signal(df: pd.DataFrame, symbol: str = "UNKNOWN"):
    strategy = AdvancedSniperSMCStrategy()
    return strategy.latest_signal(df, symbol)
