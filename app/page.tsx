"use client";

import { useEffect, useMemo, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

type Signal = {
  id?: string | number;
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

type StrategyPerformance = {
  totalSignalsLogged?: number;
  activeTrades?: number;
  rejectedSignals?: number;
  closedTrades?: number;
  tpHits?: number;
  slHits?: number;
  tp1Hits?: number;
  tp2Hits?: number;
  tp3Hits?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
};

export default function HomePage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [closed, setClosed] = useState<Signal[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [signalRes, perfRes, statusRes, closedRes] = await Promise.all([
        fetch(`${API}/all-paid-signals`, { cache: "no-store" }),
        fetch(`${API}/strategy-performance`, { cache: "no-store" }),
        fetch(`${API}/system-status`, { cache: "no-store" }),
        fetch(`${API}/closed-signals`, { cache: "no-store" }),
      ]);

      const signalData = await signalRes.json();
      const perfData = await perfRes.json();
      const statusData = await statusRes.json();
      const closedData = await closedRes.json();

      const activeSignals = [
        ...(signalData.strategyASignals || []),
        ...(signalData.strategyBSignals || []),
        ...(signalData.desk1Signals || []),
        ...(signalData.desk2Signals || []),
      ];

      setSignals(activeSignals);
      setPerformance(perfData);
      setStatus(statusData);
      setClosed(closedData.closedSignals || []);
    } catch (e) {
      console.error("Dashboard loading error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, []);

  const strategyA: StrategyPerformance = performance?.["Strategy A"] || {};
  const strategyB: StrategyPerformance = performance?.["Strategy B"] || {};

  const tpA = strategyA.tpHits || strategyA.wins || strategyA.tp3Hits || 0;
  const tpB = strategyB.tpHits || strategyB.wins || strategyB.tp3Hits || 0;
  const slA = strategyA.slHits || strategyA.losses || 0;
  const slB = strategyB.slHits || strategyB.losses || 0;

  const totalTP = tpA + tpB;
  const totalSL = slA + slB;

  const winRate = useMemo(() => {
    const total = totalTP + totalSL;
    return total ? Math.round((totalTP / total) * 100) : 0;
  }, [totalTP, totalSL]);

  return (
    <main className="min-h-screen bg-[#060A12] text-white">
      <div className="flex">
        <aside className="hidden min-h-screen w-72 border-r border-white/10 bg-[#080D17] p-6 lg:block">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-xl font-black text-black">
              EP
            </div>
            <div>
              <h1 className="text-xl font-black">EasyPips</h1>
              <p className="text-xs text-slate-400">AI Forex Signal Engine</p>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              "Dashboard",
              "Live Signals",
              "Performance",
              "Strategies",
              "History",
              "Telegram Alerts",
            ].map((item, index) => (
              <a
                key={item}
                href="#"
                className={`block rounded-2xl px-4 py-3 text-sm font-semibold ${
                  index === 0
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h3 className="font-bold">Join Telegram</h3>
            <p className="mt-2 text-sm text-slate-400">
              Get instant signal alerts and TP/SL updates.
            </p>
            <a
              href="https://t.me/easypips_signals_bot"
              target="_blank"
              className="mt-4 block rounded-2xl bg-emerald-400 px-4 py-3 text-center text-sm font-black text-black"
            >
              Join Telegram
            </a>
          </div>
        </aside>

        <section className="flex-1">
          <header className="border-b border-white/10 bg-[#080D17]/80 px-6 py-5 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
              <div>
                <p className="text-sm text-emerald-300">● Live AI System Running</p>
                <h2 className="mt-1 text-2xl font-black">Trading Dashboard</h2>
              </div>

              <div className="text-right text-sm text-slate-400">
                <p>Server Time UTC</p>
                <p className="text-white">
                  {status?.serverTimeUTC
                    ? new Date(status.serverTimeUTC).toLocaleString()
                    : "Loading..."}
                </p>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <TopCard title="Total Signals" value={status?.totalSignals || 0} />
              <TopCard title="Active Trades" value={status?.activeSignals || 0} green />
              <TopCard title="Closed Trades" value={status?.closedSignals || 0} purple />
              <TopCard title="Win Rate" value={`${winRate}%`} gold />
              <TopCard title="TP Hits" value={totalTP} green />
              <TopCard title="SL Hits" value={totalSL} red />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel className="xl:col-span-2" title="Performance Overview">
                <div className="flex h-72 items-end gap-3 rounded-2xl bg-black/30 p-6">
                  {[35, 42, 49, 47, 55, 62, 65, 72, 75, 81, 78, 86].map(
                    (h, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500 to-blue-400"
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[10px] text-slate-500">{i + 1}</span>
                      </div>
                    )
                  )}
                </div>
              </Panel>

              <Panel title="Signals Distribution">
                <div className="flex h-72 flex-col items-center justify-center">
                  <div className="flex h-44 w-44 items-center justify-center rounded-full border-[22px] border-emerald-400 border-r-blue-500">
                    <div className="text-center">
                      <p className="text-4xl font-black">{status?.totalSignals || 0}</p>
                      <p className="text-xs text-slate-400">Total</p>
                    </div>
                  </div>
                  <div className="mt-6 grid w-full grid-cols-2 gap-3 text-sm">
                    <Legend label="Strategy A" value={status?.strategyAActive || 0} />
                    <Legend label="Strategy B" value={status?.strategyBActive || 0} blue />
                  </div>
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <StrategyCard
                name="Strategy A"
                subtitle="EMA + RSI + Momentum"
                data={strategyA}
                color="emerald"
              />
              <StrategyCard
                name="Strategy B"
                subtitle="Fibonacci Pattern Strategy"
                data={strategyB}
                color="blue"
              />
              <Panel title="System Status">
                <div className="space-y-3">
                  <StatusRow label="API Status" ok />
                  <StatusRow label="Database" ok={status?.database === "connected"} />
                  <StatusRow label="Telegram" ok={status?.telegram === "connected"} />
                  <StatusRow label="AI Engine" ok />
                  <StatusRow label="Data Feed" ok />
                </div>
              </Panel>
            </div>

            <Panel title="Live Signals">
              {loading ? (
                <p className="p-4 text-slate-400">Loading live signals...</p>
              ) : signals.length === 0 ? (
                <p className="p-4 text-slate-400">
                  No active signals right now. AI is waiting for clean setups.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-slate-400">
                        <th className="p-3">Pair</th>
                        <th className="p-3">Direction</th>
                        <th className="p-3">Strategy</th>
                        <th className="p-3">Entry</th>
                        <th className="p-3">SL</th>
                        <th className="p-3">TP</th>
                        <th className="p-3">Score</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signals.map((s, i) => (
                        <SignalRow key={s.id || i} signal={s} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Recent Closed Trades">
                {closed.length === 0 ? (
                  <p className="text-slate-400">No closed trades yet.</p>
                ) : (
                  <div className="space-y-3">
                    {closed.slice(0, 6).map((s, i) => (
                      <div
                        key={s.id || i}
                        className="flex items-center justify-between rounded-2xl bg-black/30 p-4"
                      >
                        <div>
                          <p className="font-bold">{s.symbol}</p>
                          <p className="text-xs text-slate-400">
                            {s.direction} / {s.strategy}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            s.result === "SL"
                              ? "bg-red-400/10 text-red-300"
                              : "bg-emerald-400/10 text-emerald-300"
                          }`}
                        >
                          {s.result}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Risk Warning">
                <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-5">
                  <h3 className="text-lg font-black text-yellow-300">
                    Educational Signals Only
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    EasyPips signals are for educational and demo purposes only.
                    Forex trading involves risk. Always use proper risk
                    management and never trade money you cannot afford to lose.
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <h3 className="font-black text-emerald-300">Telegram Alerts</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Approved signals and TP/SL results are published to Telegram
                    automatically.
                  </p>
                </div>
              </Panel>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function TopCard({
  title,
  value,
  green,
  red,
  purple,
  gold,
}: {
  title: string;
  value: any;
  green?: boolean;
  red?: boolean;
  purple?: boolean;
  gold?: boolean;
}) {
  const color = green
    ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
    : red
    ? "text-red-400 border-red-400/20 bg-red-400/10"
    : purple
    ? "text-purple-400 border-purple-400/20 bg-purple-400/10"
    : gold
    ? "text-yellow-400 border-yellow-400/20 bg-yellow-400/10"
    : "text-blue-400 border-blue-400/20 bg-blue-400/10";

  return (
    <div className={`rounded-3xl border p-5 ${color}`}>
      <p className="text-xs font-semibold uppercase opacity-80">{title}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl ${className}`}>
      <h2 className="mb-5 text-xl font-black">{title}</h2>
      {children}
    </div>
  );
}

function StrategyCard({
  name,
  subtitle,
  data,
  color,
}: {
  name: string;
  subtitle: string;
  data: StrategyPerformance;
  color: "emerald" | "blue";
}) {
  const tp = data.tpHits || data.wins || data.tp3Hits || 0;
  const sl = data.slHits || data.losses || 0;
  const winRate = data.winRate || 0;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <h3
            className={`text-2xl font-black ${
              color === "emerald" ? "text-emerald-400" : "text-blue-400"
            }`}
          >
            {name}
          </h3>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
          LIVE
        </span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Mini label="Active" value={data.activeTrades || 0} />
        <Mini label="Closed" value={data.closedTrades || 0} />
        <Mini label="Win Rate" value={`${winRate}%`} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Mini label="TP Hits" value={tp} green />
        <Mini label="SL Hits" value={sl} red />
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  green,
  red,
}: {
  label: string;
  value: any;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`mt-2 text-xl font-black ${
          green ? "text-emerald-400" : red ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  const buy = signal.direction?.toUpperCase() === "BUY";

  return (
    <tr className="border-b border-white/5">
      <td className="p-3 font-bold">{signal.symbol}</td>
      <td className="p-3">
        <span
          className={`rounded-lg px-3 py-1 text-xs font-black ${
            buy ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
          }`}
        >
          {signal.direction}
        </span>
      </td>
      <td className="p-3 text-slate-300">{signal.strategy}</td>
      <td className="p-3 font-mono">{signal.entry}</td>
      <td className="p-3 font-mono text-red-400">{signal.sl}</td>
      <td className="p-3 font-mono text-emerald-400">
        {signal.tp3 || signal.tp2 || signal.tp1}
      </td>
      <td className="p-3">
        <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-emerald-300">
          {signal.score || signal.confidence || "N/A"}
        </span>
      </td>
      <td className="p-3">
        <span className="rounded-lg bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-300">
          {signal.status}
        </span>
      </td>
    </tr>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-black/30 p-4">
      <span className="text-slate-300">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-black ${
          ok ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
        }`}
      >
        {ok ? "ONLINE" : "OFFLINE"}
      </span>
    </div>
  );
}

function Legend({
  label,
  value,
  blue,
}: {
  label: string;
  value: number;
  blue?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className={blue ? "text-blue-400" : "text-emerald-400"}>{value}</span>
    </div>
  );
}