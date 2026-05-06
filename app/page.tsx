"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  async function load() {
    try {
      const res = await fetch(`${API_URL}/pro-signals?interval=5m`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const refresh = setInterval(load, 10000); // 10 sec
    const clock = setInterval(() => setTime(new Date()), 1000);

    return () => {
      clearInterval(refresh);
      clearInterval(clock);
    };
  }, []);

  function getSession() {
    const hour = new Date().getUTCHours();

    if (hour >= 0 && hour < 8) return "Asia";
    if (hour >= 8 && hour < 16) return "London";
    if (hour >= 16 && hour < 22) return "New York";
    return "Off Market";
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-3xl text-yellow-400 font-bold">
            EasyPips AI
          </h1>
          <p className="text-gray-400 text-sm">
            Live Trading Dashboard
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-400">
            {time.toLocaleTimeString()}
          </p>
          <p className="text-yellow-300 font-bold">
            {getSession()}
          </p>
        </div>
      </div>

      {/* STATUS */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Box label="Engine" value={data ? "ONLINE" : "OFFLINE"} />
        <Box label="Active" value={data?.active?.length ?? 0} />
        <Box label="Pending" value={data?.pending?.length ?? 0} />
      </div>

      {/* LOADING */}
      {loading && (
        <div className="text-gray-400">Loading signals...</div>
      )}

      {/* ACTIVE */}
      <h2 className="text-green-400 mb-3">Active Signals</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {data?.active?.map((s: any, i: number) => (
          <SignalCard key={i} s={s} />
        ))}
      </div>

      {/* PENDING */}
      <h2 className="text-yellow-300 mb-3">Pending Orders</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {data?.pending?.map((s: any, i: number) => (
          <SignalCard key={i} s={s} pending />
        ))}
      </div>

    </main>
  );
}

/* ---------- COMPONENTS ---------- */

function Box({ label, value }: any) {
  return (
    <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl">{value}</p>
    </div>
  );
}

function SignalCard({ s, pending = false }: any) {
  const expiry = s.valid_until
    ? new Date(s.valid_until).getTime()
    : 0;

  const now = Date.now();
  const total = 30 * 60 * 1000;
  const remaining = Math.max(0, expiry - now);

  const percent = Math.min(100, (remaining / total) * 100);

  return (
    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">

      <div className="flex justify-between">
        <h3>{s.market}</h3>

        <span
          className={`px-2 py-1 text-xs rounded ${
            s.display_decision?.includes("BUY")
              ? "bg-green-500 text-black"
              : "bg-red-500 text-white"
          }`}
        >
          {s.display_decision}
        </span>
      </div>

      <p>Entry: {s.entry ?? s.trigger_price}</p>
      <p>SL: {s.stop_loss}</p>
      <p>TP1: {s.tp1}</p>

      {/* COUNTDOWN BAR */}
      <div className="mt-3">
        <div className="h-2 bg-gray-800 rounded">
          <div
            className="h-2 bg-yellow-400 rounded"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {Math.floor(remaining / 60000)} min left
        </p>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        {pending ? "Pending" : "Active"}
      </p>
    </div>
  );
}