"use client";

import { useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function DashboardPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [status, setStatus] = useState<any>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("easypips_client_token");
    setIsLoggedIn(!!token);

    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch(`${API}/system-status`);
      const data = await res.json();
      setStatus(data);

      const sig = await fetch(`${API}/all-paid-signals`).then((r) =>
        r.json()
      );

      const all = [
        ...(sig.strategyASignals || []),
        ...(sig.strategyBSignals || []),
        ...(sig.desk1Signals || []),
        ...(sig.desk2Signals || []),
      ];

      setSignals(all);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070D] text-white p-6">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black border border-yellow-400/30">
          <img
            src="/logo.png"
            alt="EasyPips"
            className="h-10 w-10 object-contain"
          />
        </div>

        <h1 className="text-2xl font-bold tracking-wide">
          Easy<span className="text-yellow-400">Pips</span>{" "}
          <span className="text-emerald-400">AI</span>
        </h1>
      </div>

      {/* LIVE INDICATOR */}
      <div className="mb-6">
        <span className="flex items-center gap-2 text-xs font-bold text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
          Live Signals Updating
        </span>
      </div>

      {/* SIGNALS */}
      <div className="grid md:grid-cols-2 gap-4">
        {signals.map((signal, index) => {
          const locked = !isLoggedIn && index > 0;

          return (
            <div
              key={index}
              className="relative rounded-3xl border border-white/10 bg-[#0A101C] p-5 shadow-lg shadow-black/40 hover:shadow-yellow-400/10 transition-all"
            >
              {locked && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-3xl">
                  <p className="text-yellow-300 font-bold">
                    🔒 Locked Signal
                  </p>
                </div>
              )}

              <div className={locked ? "blur-sm" : ""}>
                <h3 className="text-xl font-black">
                  {signal.symbol}
                </h3>

                <p className="text-xs text-slate-400">
                  {signal.created_at
                    ? new Date(signal.created_at).toLocaleString()
                    : "Just now"}
                </p>

                <p className="text-xs text-yellow-300 mt-1">
                  Confidence:{" "}
                  {signal.score || signal.confidence || "N/A"}
                </p>

                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-xl text-xs font-bold ${
                    signal.direction === "BUY"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {signal.direction}
                </span>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Box label="Entry" value={signal.entry} />
                  <Box label="SL" value={signal.sl} red />
                  <Box label="TP1" value={signal.tp1} green />
                  <Box label="TP2" value={signal.tp2} green />
                  <Box label="TP3" value={signal.tp3} green />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Box({
  label,
  value,
  green,
  red,
}: {
  label: string;
  value?: any;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-xl bg-black/40 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`font-bold ${
          green
            ? "text-emerald-400"
            : red
            ? "text-red-400"
            : "text-white"
        }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}