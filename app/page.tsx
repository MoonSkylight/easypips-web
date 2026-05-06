"use client";

import { useEffect, useRef, useState } from "react";

// ✅ DEPLOY-READY API (FIXED)
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
};

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [selectedPair, setSelectedPair] = useState("XAUUSD");
  const [banner, setBanner] = useState("");
  const knownSignals = useRef<Set<string>>(new Set());

  async function load() {
    try {
      const res = await fetch(`${API_URL}/pro-signals?interval=5m`, {
        cache: "no-store",
      });

      const json = await res.json();

      const active = json.active || [];
      const pending = json.pending || [];

      for (const s of [...active, ...pending]) {
        if (!s.id) continue;

        if (!knownSignals.current.has(s.id)) {
          knownSignals.current.add(s.id);
          setBanner(`New ${s.display_decision}: ${s.market}`);

          setTimeout(() => setBanner(""), 5000);
        }
      }

      setData(json);
    } catch {
      setData(null);
    }
  }

  useEffect(() => {
    load();
    const refresh = setInterval(load, 60000);
    return () => clearInterval(refresh);
  }, []);

  const chartSymbol = encodeURIComponent(PAIRS[selectedPair]);

  return (
    <main className="min-h-screen bg-black px-6 py-6 text-white">

      {/* ALERT */}
      {banner && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold">
          🔔 {banner}
        </div>
      )}

      {/* HEADER */}
      <h1 className="text-3xl text-yellow-400 mb-6 font-bold">
        EasyPips AI Dashboard
      </h1>

      {/* STATS */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card title="Engine" value={data ? "ONLINE" : "OFFLINE"} />
        <Card title="Active" value={data?.active?.length ?? 0} />
        <Card title="Pending" value={data?.pending?.length ?? 0} />
        <Card title="Closed" value={data?.closed?.length ?? 0} />
      </div>

      {/* PAIR SWITCH */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(PAIRS).map((pair) => (
          <button
            key={pair}
            onClick={() => setSelectedPair(pair)}
            className={`px-4 py-2 rounded ${
              selectedPair === pair
                ? "bg-yellow-400 text-black"
                : "bg-gray-900 text-gray-300"
            }`}
          >
            {pair}
          </button>
        ))}
      </div>

      {/* CHART */}
      <div className="mb-6 border border-gray-800 rounded-xl overflow-hidden">
        <iframe
          key={selectedPair}
          src={`https://www.tradingview.com/widgetembed/?symbol=${chartSymbol}&interval=5&theme=dark`}
          className="w-full h-[500px]"
        />
      </div>

      {/* ACTIVE */}
      <h2 className="text-green-400 mb-3">Active Signals</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {data?.active?.map((s: any, i: number) => (
          <SignalCard key={i} s={s} />
        ))}
      </div>

      {/* PENDING */}
      <h2 className="text-yellow-300 mb-3">Pending Orders</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {data?.pending?.map((s: any, i: number) => (
          <SignalCard key={i} s={s} pending />
        ))}
      </div>

      {/* CLOSED */}
      <h2 className="text-blue-400 mb-3">Closed Results</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {data?.closed?.map((s: any, i: number) => (
          <ClosedCard key={i} s={s} />
        ))}
      </div>

    </main>
  );
}

/* ---------- COMPONENTS ---------- */

function Card({ title, value }: any) {
  return (
    <div className="border border-gray-700 p-4 rounded-xl">
      <p className="text-xs text-gray-400">{title}</p>
      <p className="text-2xl">{value}</p>
    </div>
  );
}

function SignalCard({ s, pending = false }: any) {
  return (
    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
      <h3>{s.market}</h3>

      <p>{pending ? "Trigger" : "Entry"}: {s.entry ?? s.trigger_price}</p>
      <p>SL: {s.stop_loss}</p>
      <p>TP1: {s.tp1}</p>

      <p className="text-xs text-gray-400 mt-2">
        {pending ? "Pending" : "Active"}
      </p>
    </div>
  );
}

function ClosedCard({ s }: any) {
  return (
    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
      <h3>{s.market}</h3>
      <p>Result: {s.result}</p>
      <p>Entry: {s.entry ?? s.trigger_price}</p>
      <p>Closed: {s.closed_price}</p>
    </div>
  );
}