"use client";

import { useEffect, useState } from "react";

type Signal = {
  id: string;
  source: string;
  desk?: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  confidence?: number;
  analyst?: string;
  note?: string;
  status: string;
  created_at: string;
};

type SignalResponse = {
  aiSignals: Signal[];
  desk1Signals: Signal[];
  desk2Signals: Signal[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function EasyPipsProSignals() {
  const [activeTab, setActiveTab] = useState<"ai" | "desk1" | "desk2">("ai");
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
      const json = await res.json();
      setData({
        aiSignals: json.aiSignals || [],
        desk1Signals: json.desk1Signals || [],
        desk2Signals: json.desk2Signals || [],
      });
    } catch (error) {
      console.error("Failed to load signals", error);
    }
  }

  useEffect(() => {
    loadSignals();
    const timer = setInterval(loadSignals, 10000);
    return () => clearInterval(timer);
  }, []);

  const signals =
    activeTab === "ai"
      ? data.aiSignals
      : activeTab === "desk1"
      ? data.desk1Signals
      : data.desk2Signals;

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-black to-slate-950 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                EASY PIPS PRO
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                Paid Trading Signals
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 md:text-base">
                AI Engine signals plus human-provided Desk 1 and Desk 2 trade setups.
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-widest text-yellow-300">
                Subscriber Access
              </p>
              <p className="text-2xl font-bold text-yellow-200">PRO LIVE</p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/5 p-2">
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
        </div>

        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {activeTab === "ai"
              ? "AI Engine Signals"
              : activeTab === "desk1"
              ? "Human Signals - Desk 1"
              : "Human Signals - Desk 2"}
          </h2>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
            {signals.length} Active
          </span>
        </div>

        {signals.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-lg font-semibold text-slate-200">
              No active signals right now
            </p>
            <p className="mt-2 text-sm text-slate-500">
              New confirmed signals will appear here automatically.
            </p>
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
      className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
        active
          ? "bg-emerald-400 text-black shadow-lg shadow-emerald-400/20"
          : "bg-transparent text-slate-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const isBuy = signal.direction === "BUY";

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-xl">
      <div
        className={`p-5 ${
          isBuy
            ? "bg-gradient-to-r from-emerald-500/20 to-transparent"
            : "bg-gradient-to-r from-red-500/20 to-transparent"
        }`}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              {signal.source}
              {signal.desk ? ` / ${signal.desk}` : ""}
            </p>
            <h3 className="mt-1 text-3xl font-black">{signal.symbol}</h3>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-sm font-black ${
              isBuy
                ? "bg-emerald-400 text-black"
                : "bg-red-500 text-white"
            }`}
          >
            {signal.direction}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ValueBox label="Entry" value={signal.entry} />
          <ValueBox label="Stop Loss" value={signal.sl} />
          <ValueBox label="TP1" value={signal.tp1} />
          <ValueBox label="TP2" value={signal.tp2} />
          <ValueBox label="TP3" value={signal.tp3} />
          <ValueBox label="Status" value={signal.status} />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
          <span>{signal.analyst || "AI Engine"}</span>
          {signal.confidence ? (
            <span className="text-emerald-300">
              Confidence {signal.confidence}%
            </span>
          ) : (
            <span>Human Verified</span>
          )}
        </div>
      </div>
    </article>
  );
}

function ValueBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}