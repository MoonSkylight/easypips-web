"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const PAIRS: Record<string, string> = {
  XAUUSD: "OANDA:XAUUSD",
  EURUSD: "OANDA:EURUSD",
  GBPUSD: "OANDA:GBPUSD",
  USDJPY: "OANDA:USDJPY",
  GBPJPY: "OANDA:GBPJPY",
  EURJPY: "OANDA:EURJPY",
  NASDAQ: "NASDAQ:IXIC",
  SP500: "SP:SPX",
  OIL: "TVC:USOIL",
  AUDUSD: "OANDA:AUDUSD",
  NZDUSD: "OANDA:NZDUSD",
  USDCHF: "OANDA:USDCHF",
  USDCAD: "OANDA:USDCAD",
  EURGBP: "OANDA:EURGBP",
  AUDJPY: "OANDA:AUDJPY",
  EURAUD: "OANDA:EURAUD",
};

type Signal = {
  id?: string;
  market: string;
  timeframe?: string;
  decision?: string;
  display_decision?: string;
  confidence?: number;
  entry?: number;
  trigger_price?: number;
  stop_loss?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  latest_price?: number;
  result?: string;
  status?: string;
  order_type?: string;
  published_at?: string;
  closed_at?: string;
  closed_price?: number;
  reasons?: string[];
};

type ApiResponse = {
  top_trade?: Signal | null;
  top_pending?: Signal | null;
  active?: Signal[];
  pending?: Signal[];
  closed?: Signal[];
  summary?: {
    active_count?: number;
    pending_count?: number;
    closed_count?: number;
    updated_at?: string;
    mode?: string;
  };
};

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type ChartLevels =
  | {
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
    }
  | null;

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [selectedPair, setSelectedPair] = useState("XAUUSD");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartLoading, setChartLoading] = useState(true);

  async function loadSignals() {
    try {
      setRefreshing(true);
      const res = await fetch(`${API_URL}/pro-signals?interval=5m`, { cache: "no-store" });
      const json = await res.json();
      setData(json);

      const preferredMarket =
        json?.top_trade?.market ||
        json?.top_pending?.market ||
        json?.pending?.[0]?.market ||
        json?.active?.[0]?.market;

      if (preferredMarket && PAIRS[preferredMarket]) {
        setSelectedPair(preferredMarket);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadCandles(market: string) {
    try {
      setChartLoading(true);
      const res = await fetch(
        `${API_URL}/candles?market=${encodeURIComponent(market)}&interval=5m&limit=120`,
        { cache: "no-store" }
      );
      const json = await res.json();
      setCandles(Array.isArray(json.candles) ? json.candles : []);
    } catch {
      setCandles([]);
    } finally {
      setChartLoading(false);
    }
  }

  useEffect(() => {
    loadSignals();
    const i = setInterval(loadSignals, 10000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    loadCandles(selectedPair);
  }, [selectedPair]);

  const active = data?.active || [];
  const pending = data?.pending || [];
  const closed = data?.closed || [];
  const top = data?.top_trade || data?.top_pending;

  const signalList = useMemo(() => [...active, ...pending, ...closed].filter(Boolean), [
    active,
    pending,
    closed,
  ]);

  const chartLevels = useMemo<ChartLevels>(() => {
    const chartTop = data?.top_trade || data?.top_pending || pending[0] || active[0];
    if (chartTop?.market === selectedPair) {
      return {
        decision: chartTop.display_decision || chartTop.decision,
        display_decision: chartTop.display_decision || chartTop.decision,
        entry: chartTop.entry ?? chartTop.trigger_price,
        stop_loss: chartTop.stop_loss,
        tp1: chartTop.tp1,
        tp2: chartTop.tp2,
        tp3: chartTop.tp3,
        confidence: chartTop.confidence,
        latest_price: chartTop.latest_price,
        timeframe: chartTop.timeframe || "5m",
      };
    }
    return null;
  }, [data, pending, active, selectedPair]);

  return (
    <main className="min-h-screen bg-[#07111f] text-[#eef4ff]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f80] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-teal-400/40 bg-teal-400/10 text-teal-300">
              <svg
                width="22"
                height="22"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="EasyPips AI mark"
                role="img"
              >
                <rect x="10" y="10" width="44" height="44" rx="14" stroke="currentColor" strokeWidth="3" />
                <path
                  d="M20 41L28 34L34 38L44 24"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="20" cy="41" r="2.5" fill="currentColor" />
                <circle cx="44" cy="24" r="2.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">EasyPips AI</h1>
              <p className="text-xs text-slate-400">AI Forex Signals Platform</p>
            </div>
          </div>

          <button
            onClick={loadSignals}
            className="rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-300 px-5 py-3 font-bold text-slate-950"
          >
            {refreshing ? "Updating..." : "Refresh"}
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_18px_rgba(34,197,94,0.7)]" />
            Engine {loading ? "starting..." : "online"}
            <span className="text-slate-500">• Auto refresh 10s</span>
          </div>

          <h2 className="max-w-3xl text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
            AI forex signals with clean execution and visible risk.
          </h2>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Live active signals, pending orders, stop loss, targets, confidence, expiry and chart levels in one professional dashboard.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Stat label="Active Signals" value={active.length} />
            <Stat label="Pending Orders" value={pending.length} />
            <Stat label="Closed Results" value={closed.length} />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-slate-400">Live AI scanner</p>
            <h3 className="text-xl font-bold">
              {top ? `${top.market} ${top.display_decision || top.decision || ""}` : "Waiting for setup"}
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-[#0c1729] p-4">
              <p className="text-xs uppercase tracking-widest text-slate-400">Top Signal</p>
              <h4 className="mt-2 text-2xl font-bold">{top?.market || "No signal"}</h4>
              <div className="mt-5 space-y-3">
                <MiniRow label="Type" value={top?.display_decision || top?.decision || "-"} />
                <MiniRow label="Entry" value={format(top?.entry ?? top?.trigger_price)} />
                <MiniRow label="Stop Loss" value={format(top?.stop_loss)} danger />
                <MiniRow label="TP1" value={format(top?.tp1)} success />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0c1729] p-4">
              <p className="text-xs uppercase tracking-widest text-slate-400">Watchlist</p>
              <div className="mt-3 space-y-1">
                {Object.keys(PAIRS).slice(0, 6).map((pair) => (
                  <button
                    key={pair}
                    onClick={() => setSelectedPair(pair)}
                    className="flex w-full items-center justify-between border-b border-white/10 py-3 text-left last:border-0"
                  >
                    <span>{pair}</span>
                    <span className="font-mono text-teal-300">
                      {selectedPair === pair ? "CHART VIEW" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.keys(PAIRS).map((pair) => (
            <button
              key={pair}
              onClick={() => setSelectedPair(pair)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                selectedPair === pair
                  ? "border border-white/10 bg-teal-300 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {pair}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1729] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <p className="text-xs uppercase tracking-widest text-slate-400">Live Chart</p>
            <h3 className="text-xl font-bold">{selectedPair}</h3>
            <button
              onClick={() => top?.market && setSelectedPair(top.market)}
              className="rounded-2xl bg-teal-300 px-4 py-2 font-bold text-slate-950"
            >
              Show Top Signal
            </button>
          </div>

          <div className="border-b border-white/10">
            {chartLoading ? (
              <div className="flex h-[540px] items-center justify-center text-slate-400">
                Loading chart...
              </div>
            ) : (
              <SignalChartInline
                market={selectedPair}
                candles={candles}
                levels={chartLevels}
                height={540}
              />
            )}
          </div>

          <div className="border-t border-white/10 p-5">
            <h3 className="mb-4 text-xl font-bold text-teal-300">
              Chart Trade Levels {top?.market ? `· ${top.market}` : ""}
            </h3>
            <div className="grid gap-4 md:grid-cols-5">
              <Level label="Entry Trigger" value={format(top?.entry ?? top?.trigger_price)} />
              <Level label="Stop Loss" value={format(top?.stop_loss)} danger />
              <Level label="TP1" value={format(top?.tp1)} success />
              <Level label="TP2" value={format(top?.tp2)} success />
              <Level label="TP3" value={format(top?.tp3)} success />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Signal feed</p>
            <h2 className="text-4xl font-extrabold tracking-tight">
              Best entries without overwhelming the user.
            </h2>
          </div>
        </div>

        <h3 className="mb-3 text-xl font-bold text-green-400">Active Signals</h3>
        <div className="mb-8 grid gap-5 md:grid-cols-3">
          {active.length ? (
            active.map((s, i) => (
              <SignalCard key={`${s.id || s.market}-${i}`} s={s} onClick={() => setSelectedPair(s.market)} />
            ))
          ) : (
            <Empty text="No active signals right now." />
          )}
        </div>

        <h3 className="mb-3 text-xl font-bold text-yellow-300">Pending Orders</h3>
        <div className="mb-8 grid gap-5 md:grid-cols-3">
          {pending.length ? (
            pending.map((s, i) => (
              <SignalCard
                key={`${s.id || s.market}-${i}`}
                s={s}
                pending
                onClick={() => setSelectedPair(s.market)}
              />
            ))
          ) : (
            <Empty text="No pending orders right now." />
          )}
        </div>

        <h3 className="mb-3 text-xl font-bold text-blue-400">Closed Results</h3>
        <div className="grid gap-5 md:grid-cols-3">
          {closed.length ? (
            closed.map((s, i) => <ClosedCard key={`${s.id || s.market}-${i}`} s={s} />)
          ) : (
            <Empty text="No closed results yet." />
          )}
        </div>

        <h3 className="mt-10 mb-3 text-xl font-bold text-slate-300">Live Feed</h3>
        <div className="grid gap-5 md:grid-cols-3">
          {signalList.slice(0, 6).map((s, i) => (
            <SignalCard key={`feed-${s.id || s.market}-${i}`} s={s} onClick={() => setSelectedPair(s.market)} />
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-5 pb-10 text-sm text-slate-500">
        Risk warning: Forex and leveraged products carry high risk. Signals are decision-support only, not financial advice.
      </footer>
    </main>
  );
}

function SignalChartInline({
  market,
  candles,
  levels,
  height = 440,
}: {
  market: string;
  candles: Candle[];
  levels?: ChartLevels;
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

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        role="img"
        aria-label={`${market} candlestick chart`}
      >
        <defs>
          <linearGradient id="bull-inline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <linearGradient id="bear-inline" x1="0" y1="0" x2="0" y2="1">
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
              <line
                x1={cx}
                x2={cx}
                y1={high}
                y2={low}
                stroke={up ? "#5eead4" : "#fb7185"}
                strokeWidth="1.3"
                opacity="0.95"
              />
              <rect
                x={cx - candleW / 2}
                y={bodyY}
                width={candleW}
                height={bodyH}
                rx="1.5"
                fill={up ? "url(#bull-inline)" : "url(#bear-inline)"}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1729] p-5 shadow-xl">
      <p className="text-sm text-slate-400">{label}</p>
      <strong className="mt-2 block text-3xl">{value}</strong>
    </div>
  );
}

function MiniRow({
  label,
  value,
  success,
  danger,
}: {
  label: string;
  value: string | number;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-between rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`font-mono font-bold ${success ? "text-green-400" : danger ? "text-red-400" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

function Level({
  label,
  value,
  success,
  danger,
}: {
  label: string;
  value: string | number;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] p-4">
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-2 font-mono text-xl font-bold ${success ? "text-green-400" : danger ? "text-red-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function SignalCard({
  s,
  pending = false,
  onClick,
}: {
  s: Signal;
  pending?: boolean;
  onClick?: () => void;
}) {
  const confidence = Number(s.confidence || 0);
  const isBuy = String(s.display_decision || s.decision || "").includes("BUY");
  const isSell = String(s.display_decision || s.decision || "").includes("SELL");

  return (
    <button
      onClick={onClick}
      className="rounded-3xl border border-white/10 bg-[#0c1729] p-5 text-left shadow-xl transition hover:-translate-y-1 hover:border-teal-300/60"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">{pending ? "Pending order" : "Live signal"}</p>
          <h3 className="mt-1 text-2xl font-bold">{s.market}</h3>
        </div>
        <span className={`rounded-full px-3 py-2 text-xs font-extrabold uppercase ${isBuy ? "bg-green-400/15 text-green-300" : isSell ? "bg-red-400/15 text-red-300" : "bg-yellow-400/15 text-yellow-300"}`}>
          {s.display_decision || s.decision || "WAIT"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Level label={pending ? "Trigger Entry" : "Entry"} value={format(s.entry ?? s.trigger_price)} />
        <Level label="Stop Loss" value={format(s.stop_loss)} danger />
        <Level label="TP1" value={format(s.tp1)} success />
        <Level label="Confidence" value={`${confidence}%`} />
      </div>

      <div className="mt-4 h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-gradient-to-r from-teal-400 to-cyan-300" style={{ width: `${Math.min(confidence, 100)}%` }} />
      </div>
    </button>
  );
}

function ClosedCard({ s }: { s: Signal }) {
  const result = String(s.result || "CLOSED");
  const good = result.includes("TP");
  const bad = result.includes("STOP") || result.includes("EXPIRED");

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1729] p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xl font-bold">{s.market}</h3>
        <span className={`rounded-full px-3 py-2 text-xs font-extrabold uppercase ${good ? "bg-green-400/15 text-green-300" : bad ? "bg-red-400/15 text-red-300" : "bg-yellow-400/15 text-yellow-300"}`}>
          {result}
        </span>
      </div>
      <MiniRow label="Entry" value={format(s.entry ?? s.trigger_price)} />
      <div className="mt-3">
        <MiniRow label="Closed" value={format(s.closed_price)} />
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="col-span-full rounded-3xl border border-white/10 bg-[#0c1729] p-6 text-slate-400">{text}</div>;
}

function format(value: any) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  if (Math.abs(num) < 10) return num.toFixed(5);
  if (Math.abs(num) >= 1000) return num.toFixed(3);
  return num.toFixed(2);
}