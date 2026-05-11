"use client";

import { useEffect, useState } from "react";

type Signal = {
  id: string;
  source: string;
  desk?: string | null;
  symbol: string;
  direction: "BUY" | "SELL";
  entry: string | number;
  sl: string | number;
  tp1: string | number;
  tp2: string | number;
  tp3: string | number;
  confidence?: number | null;
  analyst?: string | null;
  note?: string | null;
  status: string;
  result?: string | null;
  hit_tp1?: boolean;
  hit_tp2?: boolean;
  hit_tp3?: boolean;
  hit_sl?: boolean;
  created_at: string;
  closed_at?: string | null;
};

type SignalResponse = {
  aiSignals: Signal[];
  desk1Signals: Signal[];
  desk2Signals: Signal[];
};

type ClosedResponse = {
  closedSignals: Signal[];
};

type Stats = {
  todaySignals: number;
  last7DaysSignals: number;
  totalSignals: number;
  aiSignals: number;
  desk1Signals: number;
  desk2Signals: number;
  runningSignals: number;
  closedSignals: number;
  tp1Hits: number;
  tp2Hits: number;
  tp3Hits: number;
  slHits: number;
  winRate: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function EasyPipsProSignals() {
  const [activeTab, setActiveTab] = useState<"ai" | "desk1" | "desk2" | "closed">("ai");
  const [stats, setStats] = useState<Stats | null>(null);
  const [closedSignals, setClosedSignals] = useState<Signal[]>([]);
  const [data, setData] = useState<SignalResponse>({
    aiSignals: [],
    desk1Signals: [],
    desk2Signals: [],
  });

  async function loadSignals() {
    try {
      const res = await fetch(`${API_BASE}/all-paid-signals`, {
        cache: "no-store",
      });

      const json: SignalResponse = await res.json();

      setData({
        aiSignals: json.aiSignals || [],
        desk1Signals: json.desk1Signals || [],
        desk2Signals: json.desk2Signals || [],
      });
    } catch (error) {
      console.error("Failed to load signals", error);
    }
  }

  async function loadStats() {
    try {
      const res = await fetch(`${API_BASE}/signal-stats`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!json.error) {
        setStats(json);
      }
    } catch (error) {
      console.error("Failed to load stats", error);
    }
  }

  async function loadClosedSignals() {
    try {
      const res = await fetch(`${API_BASE}/closed-signals`, {
        cache: "no-store",
      });

      const json: ClosedResponse = await res.json();

      setClosedSignals(json.closedSignals || []);
    } catch (error) {
      console.error("Failed to load closed signals", error);
    }
  }

  async function loadAll() {
    await loadSignals();
    await loadStats();
    await loadClosedSignals();
  }

  useEffect(() => {
    loadAll();

    const timer = setInterval(loadAll, 15000);

    return () => clearInterval(timer);
  }, []);

  const signals =
    activeTab === "ai"
      ? data.aiSignals
      : activeTab === "desk1"
      ? data.desk1Signals
      : activeTab === "desk2"
      ? data.desk2Signals
      : closedSignals;

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-4 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-center text-sm text-yellow-300">
          ⚠ Demo Version – Signals are for testing purposes only. Not financial advice.
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-black to-slate-950 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                EASY PIPS PRO
              </div>

              <h1 className="text-3xl font-bold md:text-5xl">
                Trading Signal Dashboard
              </h1>

              <p className="mt-3 text-slate-400">
                AI Engine + Human Desk Signals + Accuracy Tracking
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-4 text-right">
              <p className="text-xs text-yellow-300">System Status</p>
              <p className="text-2xl font-bold text-yellow-200">LIVE</p>
            </div>
          </div>
        </div>

        {stats && (
          <div className="mb-6 grid gap-3 md:grid-cols-6">
            <StatCard label="Today" value={stats.todaySignals} />
            <StatCard label="Last 7 Days" value={stats.last7DaysSignals} />
            <StatCard label="Running" value={stats.runningSignals} />
            <StatCard label="Closed" value={stats.closedSignals} />
            <StatCard label="TP1 Hits" value={stats.tp1Hits} />
            <StatCard label="Win Rate" value={`${stats.winRate}%`} />
            <StatCard label="TP2 Hits" value={stats.tp2Hits} />
            <StatCard label="TP3 Hits" value={stats.tp3Hits} />
            <StatCard label="SL Hits" value={stats.slHits} />
            <StatCard label="AI" value={stats.aiSignals} />
            <StatCard label="Desk 1" value={stats.desk1Signals} />
            <StatCard label="Desk 2" value={stats.desk2Signals} />
          </div>
        )}

        <div className="mb-6 grid grid-cols-4 gap-3 rounded-2xl border border-white/10 bg-white/5 p-2">
          <TabButton
            label="AI Engine"
            active={activeTab === "ai"}
            onClick={() => setActiveTab("ai")}
          />
          <TabButton
            label="Desk 1"
            active={activeTab === "desk1"}
            onClick={() => setActiveTab("desk1")}
          />
          <TabButton
            label="Desk 2"
            active={activeTab === "desk2"}
            onClick={() => setActiveTab("desk2")}
          />
          <TabButton
            label="History"
            active={activeTab === "closed"}
            onClick={() => setActiveTab("closed")}
          />
        </div>

        <div className="mb-5 flex justify-between">
          <h2 className="text-xl font-bold">
            {activeTab === "ai"
              ? "AI Engine Signals"
              : activeTab === "desk1"
              ? "Desk 1 Signals"
              : activeTab === "desk2"
              ? "Desk 2 Signals"
              : "Closed Signal History"}
          </h2>

          <span className="rounded-full bg-white/10 px-3 py-1">
            {signals.length} {activeTab === "closed" ? "Closed" : "Active"}
          </span>
        </div>

        {signals.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            No signals yet
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <p className="text-xs uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-emerald-300">{value}</p>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
        active
          ? "bg-emerald-400 text-black"
          : "text-gray-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function formatPrice(value: string | number) {
  const num = Number(value);

  if (Number.isNaN(num)) return value;

  if (num < 10) return num.toFixed(5);

  return num.toFixed(2);
}

function SignalCard({ signal }: { signal: Signal }) {
  const isBuy = signal.direction === "BUY";
  const result = signal.result || "RUNNING";

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-4 flex justify-between">
        <div>
          <p className="text-xs text-gray-400">
            {signal.source}
            {signal.desk ? ` / ${signal.desk}` : ""}
          </p>
          <h3 className="text-2xl font-bold">{signal.symbol}</h3>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-3 py-1 font-bold ${
              isBuy ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {signal.direction}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              result === "SL"
                ? "bg-red-500/20 text-red-300"
                : result === "RUNNING"
                ? "bg-yellow-500/20 text-yellow-300"
                : "bg-emerald-500/20 text-emerald-300"
            }`}
          >
            {result}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ValueBox label="Entry" value={signal.entry} />
        <ValueBox label="SL" value={signal.sl} />
        <ValueBox label="TP1" value={signal.tp1} />
        <ValueBox label="TP2" value={signal.tp2} />
        <ValueBox label="TP3" value={signal.tp3} />
        <ValueBox label="Status" value={signal.status} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        <ResultPill label="TP1" active={!!signal.hit_tp1} />
        <ResultPill label="TP2" active={!!signal.hit_tp2} />
        <ResultPill label="TP3" active={!!signal.hit_tp3} />
        <ResultPill label="SL" active={!!signal.hit_sl} danger />
      </div>

      <div className="mt-4 flex justify-between text-sm text-gray-400">
        <span>{signal.analyst || "AI"}</span>
        <span>{signal.confidence ? `${signal.confidence}%` : "Human"}</span>
      </div>
    </div>
  );
}

function ResultPill({
  label,
  active,
  danger,
}: {
  label: string;
  active: boolean;
  danger?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2 py-1 ${
        active
          ? danger
            ? "bg-red-500 text-white"
            : "bg-emerald-400 text-black"
          : "bg-black/30 text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}

function ValueBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-black/30 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold">{formatPrice(value)}</p>
    </div>
  );
}