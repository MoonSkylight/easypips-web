"use client";

import { useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  async function load() {
    try {
      const res = await fetch(`${API_URL}/pro-signals?interval=5m`, {
        cache: "no-store",
      });

      const json = await res.json();
      setData(json);

      if (json?.top_trade?.market && PAIRS[json.top_trade.market]) {
        setSelectedPair(json.top_trade.market);
      } else if (json?.top_pending?.market && PAIRS[json.top_pending.market]) {
        setSelectedPair(json.top_pending.market);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const refresh = setInterval(load, 10000);
    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      clearInterval(refresh);
      clearInterval(timer);
    };
  }, []);

  const chartSymbol = encodeURIComponent(PAIRS[selectedPair] || "OANDA:XAUUSD");
  const topTrade = data?.top_trade || data?.top_pending;

  return (
    <main className="min-h-screen bg-black px-5 py-6 text-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-yellow-400">EasyPips AI</h1>
          <p className="text-sm text-gray-400">
            Balanced performance signals with chart trade levels
          </p>
          <p className="mt-1 text-xs text-gray-500">
            API: {data ? "ONLINE" : "OFFLINE"} · Mode: {data?.summary?.mode || "-"}
          </p>
        </div>

        <button
          onClick={load}
          className="rounded-xl bg-blue-600 px-4 py-2 font-bold"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Stat label="Engine" value={data ? "ONLINE" : "OFFLINE"} tone="green" />
        <Stat label="Active" value={data?.active?.length ?? 0} tone="green" />
        <Stat label="Pending" value={data?.pending?.length ?? 0} tone="yellow" />
        <Stat label="Closed" value={data?.closed?.length ?? 0} tone="blue" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {Object.keys(PAIRS).map((pair) => (
          <button
            key={pair}
            onClick={() => setSelectedPair(pair)}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              selectedPair === pair
                ? "bg-yellow-400 text-black"
                : "bg-gray-900 text-gray-300"
            }`}
          >
            {pair}
          </button>
        ))}
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-800 bg-gray-950">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 px-4 py-3">
          <h2 className="font-bold text-yellow-400">Live Chart: {selectedPair}</h2>
          {topTrade && (
            <button
              onClick={() => setSelectedPair(topTrade.market)}
              className="rounded-lg bg-yellow-400 px-3 py-1 text-sm font-bold text-black"
            >
              Show Top Signal
            </button>
          )}
        </div>

        <iframe
          key={selectedPair}
          src={`https://www.tradingview.com/widgetembed/?symbol=${chartSymbol}&interval=5&theme=dark&style=1`}
          className="h-[520px] w-full"
          allowFullScreen
        />

        {topTrade && (
          <div className="border-t border-gray-800 p-4">
            <h3 className="mb-3 font-bold text-yellow-400">
              Trade Levels on Chart: {topTrade.market} · {topTrade.display_decision}
            </h3>

            <div className="grid gap-3 md:grid-cols-5">
              <Level label="Entry / Trigger" value={topTrade.entry ?? topTrade.trigger_price} tone="white" />
              <Level label="Stop Loss" value={topTrade.stop_loss} tone="red" />
              <Level label="TP1" value={topTrade.tp1} tone="green" />
              <Level label="TP2" value={topTrade.tp2} tone="green" />
              <Level label="TP3" value={topTrade.tp3} tone="green" />
            </div>

            <p className="mt-3 text-xs text-gray-400">
              TradingView iframe cannot draw custom lines directly, so levels are shown below the chart as exact trade markers.
            </p>
          </div>
        )}
      </div>

      {data?.top_trade && (
        <TopBox title="TOP ACTIVE SIGNAL" item={data.top_trade} />
      )}

      {data?.top_pending && (
        <TopBox title="TOP PENDING ORDER" item={data.top_pending} pending />
      )}

      <h2 className="mb-3 text-xl font-bold text-green-400">Active Signals</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {data?.active?.length ? (
          data.active.map((s: any, i: number) => (
            <SignalCard
              key={`active-${i}`}
              s={s}
              now={now}
              onClick={() => setSelectedPair(s.market)}
            />
          ))
        ) : (
          <Empty text="No active signals right now." />
        )}
      </div>

      <h2 className="mb-3 text-xl font-bold text-yellow-300">Pending Orders</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {data?.pending?.length ? (
          data.pending.map((s: any, i: number) => (
            <SignalCard
              key={`pending-${i}`}
              s={s}
              pending
              now={now}
              onClick={() => setSelectedPair(s.market)}
            />
          ))
        ) : (
          <Empty text="No pending orders right now." />
        )}
      </div>

      <h2 className="mb-3 text-xl font-bold text-blue-400">Closed Results</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {data?.closed?.length ? (
          data.closed.map((s: any, i: number) => (
            <ClosedCard key={`closed-${i}`} s={s} />
          ))
        ) : (
          <Empty text="No closed results yet." />
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: any) {
  const colors: any = {
    green: "border-green-500 text-green-400",
    yellow: "border-yellow-400 text-yellow-300",
    blue: "border-blue-500 text-blue-400",
  };

  return (
    <div className={`rounded-xl border ${colors[tone]} bg-gray-950 p-4`}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function Level({ label, value, tone }: any) {
  const colors: any = {
    white: "text-white",
    red: "text-red-400",
    green: "text-green-400",
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-black p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${colors[tone]}`}>{formatValue(value)}</p>
    </div>
  );
}

function TopBox({ title, item, pending = false }: any) {
  return (
    <div className={`mb-6 rounded-2xl border p-5 ${
      pending
        ? "border-yellow-400 bg-yellow-400/10"
        : "border-green-500 bg-green-500/10"
    }`}>
      <h2 className={`mb-3 text-xl font-bold ${pending ? "text-yellow-300" : "text-green-400"}`}>
        {title}
      </h2>

      <div className="grid gap-3 md:grid-cols-5">
        <Level label="Pair" value={item.market} tone="white" />
        <Level label={pending ? "Trigger" : "Entry"} value={item.entry ?? item.trigger_price} tone="white" />
        <Level label="SL" value={item.stop_loss} tone="red" />
        <Level label="TP1" value={item.tp1} tone="green" />
        <Level label="Confidence" value={`${item.confidence}%`} tone="white" />
      </div>

      <p className="mt-3 text-sm text-gray-300">
        {item.reasons?.join(", ")}
      </p>
    </div>
  );
}

function SignalCard({ s, pending = false, now, onClick }: any) {
  const confidence = s.confidence || 0;
  const expiry = s.valid_until ? new Date(s.valid_until).getTime() : 0;
  const seconds = Math.max(0, Math.floor((expiry - now) / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  let barColor = "bg-red-500";
  if (confidence >= 75) barColor = "bg-green-500";
  else if (confidence >= 60) barColor = "bg-yellow-400";

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-2xl border border-gray-800 bg-gray-950 p-4 transition hover:border-yellow-400"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold">{s.market}</h3>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            s.display_decision?.includes("BUY")
              ? "bg-green-500 text-black"
              : s.display_decision?.includes("SELL")
              ? "bg-red-500 text-white"
              : "bg-yellow-400 text-black"
          }`}
        >
          {s.display_decision}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        <p>{pending ? "Trigger" : "Entry"}: {formatValue(s.entry ?? s.trigger_price)}</p>
        <p>Latest: {formatValue(s.latest_price)}</p>
        <p>SL: <span className="text-red-400">{formatValue(s.stop_loss)}</span></p>
        <p>TP1: <span className="text-green-400">{formatValue(s.tp1)}</span></p>
        <p>TP2: <span className="text-green-400">{formatValue(s.tp2)}</span></p>
        <p>TP3: <span className="text-green-400">{formatValue(s.tp3)}</span></p>
      </div>

      <div className="mt-3">
        <div className="h-2 rounded bg-gray-800">
          <div
            className={`h-2 rounded ${barColor}`}
            style={{ width: `${Math.min(confidence, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">{confidence}% confidence</p>
      </div>

      <p className="mt-2 text-xs text-yellow-300">
        Valid: {mins}:{String(secs).padStart(2, "0")}
      </p>
    </div>
  );
}

function ClosedCard({ s }: any) {
  const result = String(s.result || "CLOSED");

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
      <div className="mb-2 flex justify-between">
        <h3 className="font-bold">{s.market}</h3>
        <span
          className={`rounded px-2 py-1 text-xs font-bold ${
            result.includes("TP")
              ? "bg-green-500 text-black"
              : result.includes("STOP")
              ? "bg-red-500 text-white"
              : "bg-yellow-400 text-black"
          }`}
        >
          {result}
        </span>
      </div>

      <p>Entry: {formatValue(s.entry ?? s.trigger_price)}</p>
      <p>Closed: {formatValue(s.closed_price)}</p>
      <p>SL: {formatValue(s.stop_loss)}</p>
      <p>TP1: {formatValue(s.tp1)}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="col-span-full rounded-xl border border-gray-800 bg-gray-950 p-5 text-gray-400">
      {text}
    </div>
  );
}

function formatValue(value: any) {
  if (value === null || value === undefined || value === "") return "-";

  const num = Number(value);
  if (Number.isNaN(num)) return value;

  if (Math.abs(num) < 10) return num.toFixed(5);
  if (Math.abs(num) < 1000) return num.toFixed(3);

  return num.toFixed(2);
}