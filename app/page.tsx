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
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);

  const active = data?.active || [];
  const pending = data?.pending || [];
  const closed = data?.closed || [];
  const top = data?.top_trade || data?.top_pending;
  const chartSymbol = encodeURIComponent(PAIRS[selectedPair] || "OANDA:XAUUSD");

  return (
    <main className="min-h-screen bg-[#07111f] text-[#eef4ff]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-teal-400/40 bg-teal-400/10 text-teal-300">
              ↗
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">EasyPips AI</h1>
              <p className="text-xs text-slate-400">AI Forex Signals Platform</p>
            </div>
          </div>

          <button
            onClick={load}
            className="rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-300 px-5 py-3 font-bold text-slate-950"
          >
            {loading ? "Updating..." : "Refresh"}
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_18px_rgba(34,197,94,0.7)]" />
            Engine {data ? "online" : "offline"} · Auto refresh 10s
          </div>

          <h2 className="max-w-3xl text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
            AI forex signals with clean execution and visible risk.
          </h2>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Live active signals, pending orders, stop loss, targets, confidence,
            expiry and chart levels in one professional dashboard.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Stat label="Active Signals" value={active.length} />
            <Stat label="Pending Orders" value={pending.length} />
            <Stat label="Closed Results" value={closed.length} />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">
                Live AI scanner
              </p>
              <h3 className="text-xl font-bold">
                {top ? `${top.market} · ${top.display_decision}` : "Waiting for setup"}
              </h3>
            </div>
            <span className="rounded-full bg-green-400/15 px-3 py-2 text-xs font-extrabold uppercase text-green-300">
              {data?.summary?.mode || "Live"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-[#0c1729] p-4">
              <p className="text-xs uppercase tracking-widest text-slate-400">
                Top Signal
              </p>
              <h4 className="mt-2 text-2xl font-bold">
                {top?.market || "No signal"}
              </h4>
              <div className="mt-5 space-y-3">
                <MiniRow label="Type" value={top?.display_decision || "-"} />
                <MiniRow label="Entry" value={format(top?.entry ?? top?.trigger_price)} />
                <MiniRow label="Stop Loss" value={format(top?.stop_loss)} danger />
                <MiniRow label="TP1" value={format(top?.tp1)} success />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0c1729] p-4">
              <p className="text-xs uppercase tracking-widest text-slate-400">
                Watchlist
              </p>
              {Object.keys(PAIRS).slice(0, 6).map((pair) => (
                <button
                  key={pair}
                  onClick={() => setSelectedPair(pair)}
                  className="flex w-full items-center justify-between border-b border-white/10 py-3 text-left last:border-0"
                >
                  <span>{pair}</span>
                  <span className="font-mono text-teal-300">
                    {selectedPair === pair ? "CHART" : "VIEW"}
                  </span>
                </button>
              ))}
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
                  ? "bg-teal-300 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {pair}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1729] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">
                Live Chart
              </p>
              <h3 className="text-xl font-bold">{selectedPair}</h3>
            </div>
            {top && (
              <button
                onClick={() => setSelectedPair(top.market)}
                className="rounded-2xl bg-teal-300 px-4 py-2 font-bold text-slate-950"
              >
                Show Top Signal
              </button>
            )}
          </div>

          <iframe
            key={selectedPair}
            src={`https://www.tradingview.com/widgetembed/?symbol=${chartSymbol}&interval=5&theme=dark&style=1`}
            className="h-[540px] w-full"
            allowFullScreen
          />

          {top && (
            <div className="border-t border-white/10 p-5">
              <h3 className="mb-4 text-xl font-bold text-teal-300">
                Chart Trade Levels · {top.market}
              </h3>
              <div className="grid gap-4 md:grid-cols-5">
                <Level label="Entry / Trigger" value={top.entry ?? top.trigger_price} />
                <Level label="Stop Loss" value={top.stop_loss} danger />
                <Level label="TP1" value={top.tp1} success />
                <Level label="TP2" value={top.tp2} success />
                <Level label="TP3" value={top.tp3} success />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Signal feed
            </p>
            <h2 className="text-4xl font-extrabold tracking-tight">
              Best entries without overwhelming the user.
            </h2>
          </div>
        </div>

        <h3 className="mb-3 text-xl font-bold text-green-400">Active Signals</h3>
        <div className="mb-8 grid gap-5 md:grid-cols-3">
          {active.length ? (
            active.map((s: any, i: number) => (
              <SignalCard key={`a-${i}`} s={s} onClick={() => setSelectedPair(s.market)} />
            ))
          ) : (
            <Empty text="No active signals right now." />
          )}
        </div>

        <h3 className="mb-3 text-xl font-bold text-yellow-300">Pending Orders</h3>
        <div className="mb-8 grid gap-5 md:grid-cols-3">
          {pending.length ? (
            pending.map((s: any, i: number) => (
              <SignalCard
                key={`p-${i}`}
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
            closed.map((s: any, i: number) => <ClosedCard key={`c-${i}`} s={s} />)
          ) : (
            <Empty text="No closed results yet." />
          )}
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-5 pb-10 text-sm text-slate-500">
        Risk warning: Forex and leveraged products carry high risk. Signals are
        decision-support only, not financial advice.
      </footer>
    </main>
  );
}

function Stat({ label, value }: any) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1729] p-5 shadow-xl">
      <p className="text-sm text-slate-400">{label}</p>
      <strong className="mt-2 block text-3xl">{value}</strong>
    </div>
  );
}

function MiniRow({ label, value, success, danger }: any) {
  return (
    <div className="flex justify-between rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={`font-mono font-bold ${
          success ? "text-green-400" : danger ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Level({ label, value, success, danger }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] p-4">
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p
        className={`mt-2 font-mono text-xl font-bold ${
          success ? "text-green-400" : danger ? "text-red-400" : "text-white"
        }`}
      >
        {format(value)}
      </p>
    </div>
  );
}

function SignalCard({ s, pending = false, onClick }: any) {
  const confidence = Number(s.confidence || 0);
  const isBuy = String(s.display_decision || "").includes("BUY");
  const isSell = String(s.display_decision || "").includes("SELL");

  return (
    <button
      onClick={onClick}
      className="rounded-3xl border border-white/10 bg-[#0c1729] p-5 text-left shadow-xl transition hover:-translate-y-1 hover:border-teal-300/60"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">
            {pending ? "Pending order" : "Live signal"}
          </p>
          <h3 className="mt-1 text-2xl font-bold">{s.market}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-2 text-xs font-extrabold uppercase ${
            isBuy
              ? "bg-green-400/15 text-green-300"
              : isSell
              ? "bg-red-400/15 text-red-300"
              : "bg-yellow-400/15 text-yellow-300"
          }`}
        >
          {s.display_decision}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Level label={pending ? "Trigger" : "Entry"} value={s.entry ?? s.trigger_price} />
        <Level label="Stop Loss" value={s.stop_loss} danger />
        <Level label="TP1" value={s.tp1} success />
        <Level label="Confidence" value={`${confidence}%`} />
      </div>

      <div className="mt-4 h-2 rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-teal-400 to-cyan-300"
          style={{ width: `${Math.min(confidence, 100)}%` }}
        />
      </div>
    </button>
  );
}

function ClosedCard({ s }: any) {
  const result = String(s.result || "CLOSED");
  const good = result.includes("TP");
  const bad = result.includes("STOP");

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1729] p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xl font-bold">{s.market}</h3>
        <span
          className={`rounded-full px-3 py-2 text-xs font-extrabold ${
            good
              ? "bg-green-400/15 text-green-300"
              : bad
              ? "bg-red-400/15 text-red-300"
              : "bg-yellow-400/15 text-yellow-300"
          }`}
        >
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
  return (
    <div className="col-span-full rounded-3xl border border-white/10 bg-[#0c1729] p-6 text-slate-400">
      {text}
    </div>
  );
}

function format(value: any) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  if (Math.abs(num) < 10) return num.toFixed(5);
  if (Math.abs(num) < 1000) return num.toFixed(3);
  return num.toFixed(2);
}