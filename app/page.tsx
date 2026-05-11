"use client";

import { useEffect, useState } from "react";

type Signal = {
  id: string;
  source: string;
  desk?: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entry: string | number;
  sl: string | number;
  tp1: string | number;
  tp2: string | number;
  tp3: string | number;
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

        {/* Header */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-black to-slate-950 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                EASY PIPS PRO
              </div>

              <h1 className="text-3xl font-bold md:text-5xl">
                Paid Trading Signals
              </h1>

              <p className="mt-3 text-slate-400">
                AI + Human Desk Signals
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-4 text-right">
              <p className="text-xs text-yellow-300">Subscriber</p>
              <p className="text-2xl font-bold text-yellow-200">PRO LIVE</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/5 p-2">
          <TabButton label="AI Engine" active={activeTab === "ai"} onClick={() => setActiveTab("ai")} />
          <TabButton label="Desk 1" active={activeTab === "desk1"} onClick={() => setActiveTab("desk1")} />
          <TabButton label="Desk 2" active={activeTab === "desk2"} onClick={() => setActiveTab("desk2")} />
        </div>

        {/* Title */}
        <div className="mb-5 flex justify-between">
          <h2 className="text-xl font-bold">
            {activeTab === "ai"
              ? "AI Engine Signals"
              : activeTab === "desk1"
              ? "Desk 1 Signals"
              : "Desk 2 Signals"}
          </h2>

          <span className="bg-white/10 px-3 py-1 rounded-full">
            {signals.length} Active
          </span>
        </div>

        {/* Cards */}
        {signals.length === 0 ? (
          <div className="text-center p-10">No signals yet</div>
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

/* ---------- Components ---------- */

function TabButton({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-3 font-bold ${
        active ? "bg-emerald-400 text-black" : "text-gray-400"
      }`}
    >
      {label}
    </button>
  );
}

/* 🔥 PRICE FIX */
function formatPrice(value: string | number) {
  const num = Number(value);

  if (isNaN(num)) return value;

  // Forex
  if (num < 10) return num.toFixed(5);

  // Gold / Crypto
  return num.toFixed(2);
}

function SignalCard({ signal }: { signal: Signal }) {
  const isBuy = signal.direction === "BUY";

  return (
    <div className="p-5 rounded-3xl bg-slate-900 border border-white/10">
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400">{signal.source}</p>
          <h3 className="text-2xl font-bold">{signal.symbol}</h3>
        </div>

        <span
          className={`px-3 py-1 rounded-full font-bold ${
            isBuy ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {signal.direction}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ValueBox label="Entry" value={signal.entry} />
        <ValueBox label="SL" value={signal.sl} />
        <ValueBox label="TP1" value={signal.tp1} />
        <ValueBox label="TP2" value={signal.tp2} />
        <ValueBox label="TP3" value={signal.tp3} />
        <ValueBox label="Status" value={signal.status} />
      </div>

      <div className="mt-4 text-sm flex justify-between text-gray-400">
        <span>{signal.analyst || "AI"}</span>
        <span>{signal.confidence ? `${signal.confidence}%` : ""}</span>
      </div>
    </div>
  );
}

function ValueBox({ label, value }: any) {
  return (
    <div className="p-3 bg-black/30 rounded-xl">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold">{formatPrice(value)}</p>
    </div>
  );
}