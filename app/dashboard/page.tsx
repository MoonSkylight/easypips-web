"use client";

import { useEffect, useMemo, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function Dashboard() {
  const [signals, setSignals] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [status, setStatus] = useState<any>({});
  const [filter, setFilter] = useState("All");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  async function load() {
    const [sig, news, stat] = await Promise.all([
      fetch(`${API}/all-paid-signals`).then((r) => r.json()),
      fetch(`${API}/news-calendar`).then((r) => r.json()),
      fetch(`${API}/system-status`).then((r) => r.json()),
    ]);

    const all = [
      ...(sig.strategyASignals || []),
      ...(sig.strategyBSignals || []),
      ...(sig.desk1Signals || []),
      ...(sig.desk2Signals || []),
    ];

    setSignals(all);
    setNews(news.events || []);
    setStatus(stat);
  }

  useEffect(() => {
    const token = localStorage.getItem("easypips_client_token");

    if (token && token.length > 20) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }

    load();
  }, []);

  const filtered =
    filter === "All"
      ? signals
      : signals.filter(
          (s) =>
            s.strategy === filter ||
            s.desk === filter ||
            s.source === filter
        );

  return (
    <main className="min-h-screen bg-[#05070D] text-white p-6">
      <div className="grid xl:grid-cols-[1.3fr_0.7fr] gap-6">

        {/* LEFT */}
        <div>
          <h1 className="text-3xl font-black mb-5">Signals Dashboard</h1>

          <div className="flex gap-2 mb-4">
            {["All", "Strategy A", "Strategy B", "Desk 1", "Desk 2"].map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl ${
                    filter === f
                      ? "bg-yellow-400 text-black"
                      : "bg-white/10"
                  }`}
                >
                  {f}
                </button>
              )
            )}
          </div>

          {!isLoggedIn && (
            <div className="mb-4 p-4 rounded-2xl bg-yellow-400/10 border border-yellow-400/20">
              <p className="text-yellow-300 font-bold">Free preview mode</p>
              <p className="text-sm text-slate-300 mt-1">
                View 1 signal for free. Sign up to unlock all signals.
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((s, i) => {
              const locked = !isLoggedIn && i > 0;

              return (
                <div
                  key={i}
                  className="relative rounded-2xl bg-black/30 p-4 border border-white/10"
                >
                  {locked && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4 rounded-2xl">
                      <p className="text-yellow-400 font-bold">
                        Paid Signal Locked
                      </p>
                      <div className="mt-3 flex gap-2">
                        <a
                          href="/client/signup"
                          className="bg-yellow-400 px-3 py-2 rounded text-black font-bold"
                        >
                          Sign Up
                        </a>
                        <a
                          href="/client/login"
                          className="border px-3 py-2 rounded"
                        >
                          Sign In
                        </a>
                      </div>
                    </div>
                  )}

                  <div className={locked ? "blur-sm" : ""}>
                    <h3 className="font-black text-xl">{s.symbol}</h3>
                    <p>{s.direction}</p>
                    <p>Entry: {s.entry}</p>
                    <p className="text-red-400">SL: {s.sl}</p>
                    <p className="text-green-400">
                      TP: {s.tp3 || s.tp2 || s.tp1 || s.tp}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          {/* NEWS */}
          <div className="bg-black/30 p-4 rounded-2xl">
            <h2 className="font-black mb-3">News</h2>
            {news.map((n, i) => (
              <div key={i} className="text-sm mb-2">
                {n.time} {n.currency} - {n.event}
              </div>
            ))}
          </div>

          {/* SYSTEM */}
          <div className="bg-black/30 p-4 rounded-2xl">
            <h2 className="font-black mb-3">System</h2>
            <p>Status: {status.status}</p>
            <p>Signals: {status.totalSignals}</p>
          </div>

          {/* TELEGRAM */}
          <div className="bg-black/30 p-4 rounded-2xl">
            <h2 className="font-black mb-3">Telegram</h2>
            <a
              href="https://t.me/easypips_signals_bot"
              className="text-green-400"
            >
              Open Telegram
            </a>
          </div>

          {/* RISK */}
          <div className="bg-black/30 p-4 rounded-2xl text-xs text-slate-400">
            Trading involves risk. Use proper risk management.
          </div>
        </div>
      </div>
    </main>
  );
}