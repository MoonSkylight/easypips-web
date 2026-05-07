"use client";

import { useMemo } from "react";

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type Levels = {
  decision?: string;
  display_decision?: string;
  entry?: number;
  stop_loss?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  confidence?: number;
  latest_price?: number;
  timeframe?: string;
};

export default function SignalChart({
  market,
  candles,
  levels,
  height = 440,
}: {
  market: string;
  candles: Candle[];
  levels?: Levels | null;
  height?: number;
}) {
  const series = useMemo(() => {
    if (!candles?.length) return null;

    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const extra = [levels?.tp1, levels?.tp2, levels?.tp3, levels?.entry, levels?.stop_loss, levels?.latest_price].filter(
      (v): v is number => typeof v === "number"
    );

    const max = Math.max(...highs, ...extra);
    const min = Math.min(...lows, ...extra);
    const pad = (max - min) * 0.12 || max * 0.01 || 1;

    return { max: max + pad, min: min - pad };
  }, [candles, levels]);

  if (!candles?.length || !series) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-[#07111f] text-slate-400">
        No candle data available for {market}.
      </div>
    );
  }

  const width = 1200;
  const innerW = 1120;
  const innerH = height - 80;
  const left = 48;
  const top = 22;
  const bottom = 28;
  const usableH = innerH - top - bottom;
  const usableW = innerW;
  const n = candles.length;
  const step = usableW / n;
  const candleW = Math.max(2, Math.min(10, step * 0.6));

  const y = (v: number) => top + ((series.max - v) / (series.max - series.min)) * usableH;
  const x = (i: number) => left + i * step + step / 2;

  return (
    <div className="w-full overflow-hidden bg-[#07111f]" style={{ height }}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-slate-400">
        <span>{market}</span>
        <span>{levels?.display_decision || levels?.decision || "Chart"}</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={`${market} candlestick chart`}>
        <defs>
          <linearGradient id="bull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <linearGradient id="bear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
        </defs>

        {[levels?.entry, levels?.stop_loss, levels?.tp1, levels?.tp2, levels?.tp3]
          .filter((v): v is number => typeof v === "number")
          .map((v, idx) => (
            <g key={idx}>
              <line
                x1={left}
                x2={width - 20}
                y1={y(v)}
                y2={y(v)}
                stroke={idx === 1 ? "#fb7185" : "#5eead4"}
                strokeDasharray="8 6"
                strokeWidth="1.5"
                opacity="0.7"
              />
              <text x={width - 16} y={y(v) - 4} fill="#cbd5e1" fontSize="12" textAnchor="end">
                {v.toFixed(5)}
              </text>
            </g>
          ))}

        {candles.map((c, i) => {
          const high = y(c.high);
          const low = y(c.low);
          const open = y(c.open);
          const close = y(c.close);
          const up = c.close >= c.open;
          const cx = x(i);
          const bodyY = Math.min(open, close);
          const bodyH = Math.max(1.5, Math.abs(close - open));

          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={high} y2={low} stroke={up ? "#5eead4" : "#fb7185"} strokeWidth="1.3" opacity="0.95" />
              <rect x={cx - candleW / 2} y={bodyY} width={candleW} height={bodyH} rx="1.5" fill={up ? "url(#bull)" : "url(#bear)"} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}