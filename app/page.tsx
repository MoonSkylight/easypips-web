"use client";

import { useEffect, useMemo, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

type Signal = {
  id?: string;
  symbol: string;
  direction: string;
  entry: string;
  sl: string;
  tp1?: string;
  tp2?: string;
  tp3?: string;
  strategy?: string;
  pattern?: string;
  score?: number;
  confidence?: number;
  status?: string;
  result?: string;
  created_at?: string;
};

type Performance = {
  totalSignalsLogged?: number;
  activeTrades?: number;
  rejectedSignals?: number;
  closedTrades?: number;
  tpHits?: number;
  slHits?: number;
  winRate?: number;
  wins?: number;
  losses?: number;
  tp3Hits?: number;
};

export default function HomePage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [signalRes, perfRes, statusRes] = await Promise.all([
        fetch(`${API}/all-paid-signals`, { cache: "no-store" }),
        fetch(`${API}/strategy-performance`, { cache: "no-store" }),
        fetch(`${API}/system-status`, { cache: "no-store" }),
      ]);

      const signalData = await signalRes.json();
      const perfData = await perfRes.json();
      const statusData = await statusRes.json();

      const allSignals = [
        ...(signalData.strategyASignals || []),
        ...(signalData.strategyBSignals || []),
        ...(signalData.desk1Signals || []),
        ...(signalData.desk2Signals || []),
      ];

      setSignals(allSignals);
      setPerformance(perfData);
      setStatus(statusData);
    } catch (error) {
      console.error("Failed to load dashboard", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const strategyA: Performance = performance?.["Strategy A"] || {};
  const strategyB: Performance = performance?.["Strategy B"] || {};

  const totalSignals = status?.totalSignals || 0;
  const activeSignals = status?.activeSignals || 0;
  const closedSignals = status?.closedSignals || 0;

  const tpHits =
    (strategyA.tpHits || strategyA.wins || strategyA.tp3Hits || 0) +
    (strategyB.tpHits || strategyB.wins || strategyB.tp3Hits || 0);

  const slHits =
    (strategyA.slHits || strategyA.losses || 0) +
    (strategyB.slHits || strategyB.losses || 0);

  const winRate = useMemo(() => {
    const closed = tpHits + slHits;
    if (!closed) return 0;
    return Math.round((tpHits / closed) * 100);
  }, [tpHits, slHits]);

  return (
    <main className="min-h-screen bg-[#070B14] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#00ffb220,transparent_35%),radial-gradient(circle_at_top_left,#3b82f620,transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-8">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-xl font-black text-black shadow-lg shadow-emerald-400/30">
                EP
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wide">EasyPips</h1>
                <p className="text-xs text-slate-400">AI Forex Signal Engine</p>
              </div>
            </div>

            <a
              href="https://t.me/easypips_signals_bot"
              target="_blank"
              className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-bold text-black shadow-lg shadow-emerald-400/20 transition hover:scale-105"
            >
              Join Telegram
            </a>
          </nav>

          <div className="grid gap-10 py-16 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
                🟢 Live AI signal system running
              </div>

              <h2 className="max-w-2xl text-5xl font-black leading-tight md:text-6xl">
                AI Forex Signals Built For{" "}
                <span className="text-emerald-400">Precision</span>
              </h2>

              <p className="mt-6 max-w-xl text-lg text-slate-300">
                EasyPips tracks market structure using Strategy A and Fibonacci
                Strategy B, then publishes high-quality signals with live TP/SL
                tracking.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#signals"
                  className="rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-black transition hover:scale-105"
                >
                  View Live Signals
                </a>
                <a
                  href="#performance"
                  className="rounded-2xl border border-white/15 px-6 py-3 font-bold text-white transition hover:bg-white/10"
                >
                  View Performance
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold">System Overview</h3>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  {status?.status || "loading"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Total Signals" value={totalSignals} />
                <StatCard label="Active Trades" value={activeSignals} />
                <StatCard label="TP Hits" value={tpHits} green />
                <StatCard label="SL Hits" value={slHits} red />
              </div>

              <div className="mt-5 rounded-2xl bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Overall Win Rate</span>
                  <span className="text-3xl font-black text-emerald-400">
                    {winRate}%
                  </span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${Math.min(winRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="performance" className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-black">Strategy Performance</h2>
            <p className="text-slate-400">Strategy A vs Strategy B comparison</p>
          </div>
          <button
            onClick={loadData}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <StrategyCard name="Strategy A" desc="EMA + RSI + Momentum" data={strategyA} />
          <StrategyCard name="Strategy B" desc="Fibonacci Pattern Strategy" data={strategyB} />
        </div>
      </section>

      <section id="signals" className="mx-auto max-w-7xl px-6 pb-16">
        <div className="mb-6">
          <h2 className="text-3xl font-black">Live Signals</h2>
          <p className="text-slate-400">Active trades currently being tracked</p>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-300">
            Loading live signals...
          </div>
        ) : signals.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-300">
            No active signals right now. The AI is waiting for clean setups.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {signals.map((signal, index) => (
              <SignalCard key={signal.id || index} signal={signal} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-white/10 bg-white/[0.03]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 md:grid-cols-3">
          <FeatureCard
            title="AI Strategy Engine"
            text="Strategy A scans EMA trend, RSI zones, and momentum pressure."
          />
          <FeatureCard
            title="Fibonacci Pattern Engine"
            text="Strategy B waits for retracement and confirmation setups."
          />
          <FeatureCard
            title="Telegram Alerts"
            text="Approved signals and TP/SL updates are sent automatically."
          />
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-slate-500">
        EasyPips signals are for educational/demo purposes only. Forex trading
        involves risk and is not financial advice.
      </footer>
    </main>
  );
}

function StatCard({
  label,
  value,
  green,
  red,
}: {
  label: string;
  value: number;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p
        className={`mt-2 text-3xl font-black ${
          green ? "text-emerald-400" : red ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StrategyCard({
  name,
  desc,
  data,
}: {
  name: string;
  desc: string;
  data: Performance;
}) {
  const tp = data.tpHits || data.wins || data.tp3Hits || 0;
  const sl = data.slHits || data.losses || 0;
  const winRate = data.winRate || 0;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-black">{name}</h3>
          <p className="text-sm text-slate-400">{desc}</p>
        </div>
        <span className="rounded-full bg-blue-400/10 px-3 py-1 text-xs font-bold text-blue-300">
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MiniStat label="Active" value={data.activeTrades || 0} />
        <MiniStat label="Closed" value={data.closedTrades || 0} />
        <MiniStat label="TP" value={tp} green />
        <MiniStat label="SL" value={sl} red />
      </div>

      <div className="mt-6 rounded-2xl bg-black/30 p-5">
        <div className="flex justify-between">
          <span className="text-slate-400">Win Rate</span>
          <span className="font-black text-emerald-400">{winRate}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-400"
            style={{ width: `${Math.min(winRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  green,
  red,
}: {
  label: string;
  value: number;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`mt-1 text-2xl font-black ${
          green ? "text-emerald-400" : red ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const isBuy = signal.direction?.toUpperCase() === "BUY";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl transition hover:-translate-y-1 hover:bg-white/[0.06]">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-black">{signal.symbol}</h3>
          <p className="text-sm text-slate-400">
            {signal.strategy || "Strategy"} · {signal.pattern || "setup"}
          </p>
        </div>

        <span
          className={`rounded-full px-4 py-1 text-sm font-black ${
            isBuy
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-red-400/10 text-red-300"
          }`}
        >
          {signal.direction}
        </span>
      </div>

      <div className="space-y-3">
        <PriceRow label="Entry" value={signal.entry} />
        <PriceRow label="Stop Loss" value={signal.sl} red />
        <PriceRow label="Take Profit" value={signal.tp3 || signal.tp2 || signal.tp1} green />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
        <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-300">
          {signal.status || "ACTIVE"}
        </span>
        <span className="text-sm text-slate-400">
          Score: {signal.score || signal.confidence || "N/A"}
        </span>
      </div>
    </div>
  );
}

function PriceRow({
  label,
  value,
  green,
  red,
}: {
  label: string;
  value?: string;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={`font-mono font-bold ${
          green ? "text-emerald-400" : red ? "text-red-400" : "text-white"
        }`}
      >
        {value || "-"}
      </span>
    </div>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
      <h3 className="text-xl font-black">{title}</h3>
      <p className="mt-3 text-sm text-slate-400">{text}</p>
    </div>
  );
}