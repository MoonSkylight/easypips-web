"use client";

import { useEffect, useMemo, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

type Signal = {
  id?: string | number;
  symbol?: string;
  direction?: string;
  entry?: string | number;
  sl?: string | number;
  tp?: string | number;
  tp1?: string | number;
  tp2?: string | number;
  tp3?: string | number;
  strategy?: string;
  desk?: string;
  source?: string;
  pattern?: string;
  status?: string;
  result?: string;
  score?: number;
  confidence?: number;
  created_at?: string;
};

type Perf = {
  totalSignalsLogged?: number;
  totalSignals?: number;
  activeTrades?: number;
  closedTrades?: number;
  rejectedSignals?: number;
  tpHits?: number;
  slHits?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
};

type NewsEvent = {
  time: string;
  currency: string;
  event: string;
  impact: string;
};

type Account = {
  id?: string;
  name?: string;
  platform?: string;
  broker?: string;
  account_login?: string;
  status?: string;
  risk_mode?: string;
  max_lot?: number;
  auto_trade_enabled?: boolean;
  kill_switch?: boolean;
  consent?: boolean;
};

const filters = ["All", "Strategy A", "Strategy B", "Desk 1", "Desk 2"];

export default function MainDashboardPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [closedSignals, setClosedSignals] = useState<Signal[]>([]);
  const [performance, setPerformance] = useState<any>({});
  const [deskPerformance, setDeskPerformance] = useState<any>({});
  const [status, setStatus] = useState<any>({});
  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    const token = localStorage.getItem("easypips_client_token");
    setIsLoggedIn(Boolean(token));

    try {
      const [
        signalsRes,
        perfRes,
        statusRes,
        closedRes,
        deskPerfRes,
        newsRes,
        accountsRes,
      ] = await Promise.all([
        fetch(`${API}/all-paid-signals`, { cache: "no-store" }),
        fetch(`${API}/strategy-performance`, { cache: "no-store" }),
        fetch(`${API}/system-status`, { cache: "no-store" }),
        fetch(`${API}/closed-signals`, { cache: "no-store" }),
        fetch(`${API}/desk-performance`, { cache: "no-store" }),
        fetch(`${API}/news-calendar`, { cache: "no-store" }),
        fetch(`${API}/client-accounts`, { cache: "no-store" }),
      ]);

      const signalsData = await signalsRes.json();
      const perfData = await perfRes.json();
      const statusData = await statusRes.json();
      const closedData = await closedRes.json();
      const deskPerfData = await deskPerfRes.json();
      const newsData = await newsRes.json();
      const accountsData = await accountsRes.json();

      const activeSignals: Signal[] = [
        ...(signalsData.strategyASignals || []),
        ...(signalsData.strategyBSignals || []),
        ...(signalsData.desk1Signals || []),
        ...(signalsData.desk2Signals || []),
      ];

      setSignals(activeSignals);
      setPerformance(perfData || {});
      setStatus(statusData || {});
      setClosedSignals(closedData.closedSignals || []);
      setDeskPerformance(deskPerfData || {});
      setNewsEvents(newsData.events || []);
      setAccounts(accountsData.accounts || []);
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(loadDashboard, 30000);
    return () => clearInterval(timer);
  }, []);

  const visibleSignals = useMemo(() => {
    const filtered =
      filter === "All"
        ? signals
        : signals.filter(
            (s) => s.strategy === filter || s.desk === filter || s.source === filter
          );

    if (isLoggedIn) return filtered;
    return filtered.slice(0, 1);
  }, [signals, filter, isLoggedIn]);

  const strategyA: Perf = performance?.["Strategy A"] || {};
  const strategyB: Perf = performance?.["Strategy B"] || {};
  const desk1: Perf = deskPerformance?.["Desk 1"] || {};
  const desk2: Perf = deskPerformance?.["Desk 2"] || {};

  const totalTP =
    (strategyA.tpHits || strategyA.wins || 0) +
    (strategyB.tpHits || strategyB.wins || 0) +
    (desk1.tpHits || 0) +
    (desk2.tpHits || 0);

  const totalSL =
    (strategyA.slHits || strategyA.losses || 0) +
    (strategyB.slHits || strategyB.losses || 0) +
    (desk1.slHits || 0) +
    (desk2.slHits || 0);

  const winRate = useMemo(() => {
    const total = totalTP + totalSL;
    return total ? Math.round((totalTP / total) * 100) : 0;
  }, [totalTP, totalSL]);

  return (
    <main className="min-h-screen bg-[#05070D] text-white">
      <header className="border-b border-white/10 bg-[#080C14] px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black">
              EP
            </div>
            <div>
              <h1 className="text-xl font-black">EasyPips Dashboard</h1>
              <p className="text-xs text-slate-400">
                Signals, performance, news, MT4/MT5, and Desk support
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/"
              className="rounded-2xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10"
            >
              Home
            </a>

            {isLoggedIn ? (
              <>
                <a
                  href="/account"
                  className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black"
                >
                  My Dashboard
                </a>
                <button
                  onClick={() => {
                    localStorage.removeItem("easypips_client_token");
                    setIsLoggedIn(false);
                  }}
                  className="rounded-2xl bg-red-400 px-5 py-3 font-black text-black"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a
                  href="/client/signup"
                  className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black"
                >
                  Sign Up Free
                </a>
                <a
                  href="/client/login"
                  className="rounded-2xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10"
                >
                  Sign In
                </a>
              </>
            )}

            <a
              href="https://t.me/easypips_signals_bot"
              target="_blank"
              className="rounded-2xl bg-emerald-400 px-5 py-3 font-black text-black"
            >
              Telegram
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-yellow-300">
              {isLoggedIn ? "Paid signal access unlocked" : "Free live preview"}
            </p>

            <h2 className="mt-3 text-5xl font-black leading-tight">
              Live Forex Signals and Performance Tracking
            </h2>

            <p className="mt-5 max-w-2xl text-slate-300">
              View Strategy A, Fibonacci Strategy B, Desk 1 and Desk 2 signals,
              economic news, signal history, MT4/MT5 access, Telegram alerts,
              and full performance tracking.
            </p>

            {!isLoggedIn && (
              <div className="mt-6 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-5">
                <p className="font-black text-yellow-300">
                  You are viewing one free signal preview.
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Sign up free to unlock all paid signals, signal history,
                  market news, Desk 1 / Desk 2 support, and client performance.
                </p>
              </div>
            )}
          </div>

          <Panel title="System Status">
            <div className="grid grid-cols-2 gap-3">
              <Mini label="Backend" value={status?.status || "running"} green />
              <Mini label="Database" value={status?.database || "connected"} green />
              <Mini label="Telegram" value={status?.telegram || "connected"} green />
              <Mini
                label="Last Signal"
                value={
                  status?.lastSignalTime
                    ? new Date(status.lastSignalTime).toLocaleDateString()
                    : "-"
                }
              />
            </div>
          </Panel>
        </div>

        {message && (
          <div className="rounded-2xl bg-black/30 p-4 text-yellow-300">
            {message}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <TopStat title="Total Signals" value={status?.totalSignals || 0} color="blue" />
          <TopStat title="Active" value={status?.activeSignals || 0} color="green" />
          <TopStat title="Closed" value={status?.closedSignals || 0} color="purple" />
          <TopStat title="TP Hits" value={totalTP} color="green" />
          <TopStat title="SL Hits" value={totalSL} color="red" />
          <TopStat title="Win Rate" value={`${winRate}%`} color="gold" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <Panel title={isLoggedIn ? "All Paid Signals" : "Live Signal Preview"}>
              <div className="mb-5 flex flex-wrap gap-2">
                {filters.map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`rounded-xl px-4 py-2 text-sm font-black ${
                      filter === item
                        ? "bg-yellow-400 text-black"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {loading ? (
                <p className="text-slate-400">Loading signals...</p>
              ) : visibleSignals.length === 0 ? (
                <div className="rounded-2xl bg-black/30 p-6 text-slate-400">
                  No active signals right now.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {visibleSignals.map((signal, index) => (
                    <SignalCard key={signal.id || index} signal={signal} />
                  ))}
                </div>
              )}

              {!isLoggedIn && (
                <div className="mt-5 rounded-3xl border border-yellow-400/20 bg-black/30 p-5 text-center">
                  <p className="text-lg font-black text-yellow-300">
                    Unlock all paid signals
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Sign up to access all active signals, history, news, and
                    Desk support.
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <a
                      href="/client/signup"
                      className="rounded-xl bg-yellow-400 px-5 py-3 font-black text-black"
                    >
                      Sign Up Free
                    </a>
                    <a
                      href="/client/login"
                      className="rounded-xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10"
                    >
                      Sign In
                    </a>
                  </div>
                </div>
              )}
            </Panel>

            {isLoggedIn && (
              <Panel title="Signal History">
                {closedSignals.length === 0 ? (
                  <p className="rounded-2xl bg-black/30 p-5 text-slate-400">
                    No closed signals yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-slate-400">
                          <th className="p-3">Symbol</th>
                          <th className="p-3">Direction</th>
                          <th className="p-3">Source</th>
                          <th className="p-3">Entry</th>
                          <th className="p-3">SL</th>
                          <th className="p-3">TP</th>
                          <th className="p-3">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {closedSignals.slice(0, 20).map((signal, index) => (
                          <tr key={signal.id || index} className="border-b border-white/5">
                            <td className="p-3 font-black">{signal.symbol}</td>
                            <td className="p-3">{signal.direction}</td>
                            <td className="p-3">
                              {signal.strategy || signal.desk || signal.source || "-"}
                            </td>
                            <td className="p-3 font-mono">{signal.entry || "-"}</td>
                            <td className="p-3 font-mono text-red-400">{signal.sl || "-"}</td>
                            <td className="p-3 font-mono text-emerald-400">
                              {signal.tp3 || signal.tp2 || signal.tp1 || signal.tp || "-"}
                            </td>
                            <td className="p-3">
                              <span
                                className={`rounded-lg px-3 py-1 text-xs font-black ${
                                  String(signal.result).includes("SL")
                                    ? "bg-red-400/10 text-red-300"
                                    : "bg-emerald-400/10 text-emerald-300"
                                }`}
                              >
                                {signal.result || signal.status || "-"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            )}
          </div>

          <aside className="space-y-6">
            <Panel title="Economic News Calendar">
              <div className="mb-4 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-blue-400/10 px-3 py-1 text-blue-300">
                  Live Feed
                </span>
                <span className="rounded-full bg-red-400/10 px-3 py-1 text-red-300">
                  High Impact
                </span>
                <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-yellow-300">
                  Medium
                </span>
              </div>

              <div className="space-y-3">
                {newsEvents.length === 0 ? (
                  <p className="rounded-2xl bg-black/30 p-4 text-sm text-slate-400">
                    No news events loaded.
                  </p>
                ) : (
                  newsEvents.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[50px_45px_1fr_65px] items-center gap-2 rounded-2xl bg-black/30 p-3 text-sm"
                    >
                      <span className="text-slate-400">{item.time}</span>
                      <span className="font-bold">{item.currency}</span>
                      <span className="text-slate-300">{item.event}</span>
                      <span
                        className={`rounded-lg px-2 py-1 text-center text-xs font-black ${
                          item.impact === "High"
                            ? "bg-red-400/10 text-red-300"
                            : "bg-yellow-400/10 text-yellow-300"
                        }`}
                      >
                        {item.impact}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            <Panel title="Strategy Performance">
              <div className="space-y-4">
                <PerfBox title="Strategy A" subtitle="EMA + RSI + Momentum" data={strategyA} />
                <PerfBox title="Strategy B" subtitle="Fibonacci Pattern" data={strategyB} />
                <PerfBox title="Desk 1" subtitle="Manual trading desk" data={desk1} />
                <PerfBox title="Desk 2" subtitle="Manual trading desk" data={desk2} />
              </div>
            </Panel>

            <Panel title="MT4 / MT5 Connection">
              <p className="text-sm leading-6 text-slate-300">
                Connect your MT4 or MT5 account, request approval, set max lot,
                and prepare for future auto-copy execution.
              </p>

              {accounts.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-black/30 p-4 text-sm text-slate-400">
                  No client accounts connected yet.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {accounts.slice(0, 2).map((account) => (
                    <div key={account.id} className="rounded-2xl bg-black/30 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black">{account.platform || "MT"} Account</p>
                          <p className="text-xs text-slate-400">
                            {account.name || "Client"} · {account.broker || "Broker"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            account.auto_trade_enabled
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-red-400/10 text-red-300"
                          }`}
                        >
                          {account.auto_trade_enabled ? "AUTO ON" : "AUTO OFF"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <a
                href="/account"
                className="mt-4 block rounded-2xl bg-yellow-400 px-5 py-4 text-center font-black text-black"
              >
                Manage MT4 / MT5 Account
              </a>
            </Panel>

            <Panel title="Client Area">
              <div className="grid gap-3">
                <a
                  href="/account"
                  className="rounded-2xl bg-yellow-400 px-5 py-4 text-center font-black text-black"
                >
                  My Dashboard
                </a>
                <a
                  href="/admin/requests"
                  className="rounded-2xl border border-white/10 px-5 py-4 text-center font-black text-white hover:bg-white/10"
                >
                  Desk Requests
                </a>
                <a
                  href="https://t.me/easypips_signals_bot"
                  target="_blank"
                  className="rounded-2xl bg-emerald-400 px-5 py-4 text-center font-black text-black"
                >
                  Telegram Alerts
                </a>
              </div>
            </Panel>

            <Panel title="Telegram Signals">
              <p className="text-sm leading-6 text-slate-300">
                Get instant alerts, TP/SL updates, and important system
                notifications directly on Telegram.
              </p>

              <a
                href="https://t.me/easypips_signals_bot"
                target="_blank"
                className="mt-4 block rounded-2xl bg-emerald-400 px-5 py-4 text-center font-black text-black"
              >
                Open Telegram
              </a>
            </Panel>

            <Panel title="Risk Management">
              <div className="space-y-3 text-sm text-slate-300">
                <InfoLine title="Use Small Lots" text="Start with low risk such as 0.01 while testing." />
                <InfoLine title="Kill Switch" text="Auto trading can be disabled instantly for safety." />
                <InfoLine title="Consent Required" text="Clients must approve automated trading risk before auto-copy." />
              </div>
            </Panel>

            <Panel title="Risk Disclaimer">
              <p className="text-xs leading-5 text-slate-400">
                EasyPips signals are provided for educational purposes only.
                Trading forex, gold, indices, and crypto involves substantial
                risk. You may lose part or all of your capital. Always use
                proper risk management and trade responsibly.
              </p>
            </Panel>
          </aside>
        </section>
      </section>
    </main>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const direction = String(signal.direction || "").toUpperCase();
  const isBuy = direction === "BUY" || direction === "BUY LIMIT" || direction === "BUY STOP";
  const source = signal.strategy || signal.desk || signal.source || "Signal";

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0A101C] p-5 shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400">{signal.pattern || source}</p>
          <h3 className="mt-1 text-2xl font-black">{signal.symbol || "-"}</h3>
        </div>
        <span
          className={`rounded-xl px-3 py-1 text-xs font-black ${
            isBuy ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
          }`}
        >
          {signal.direction || "-"}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <SourceBadge source={source} />
        <span className="text-xs font-black text-yellow-300">
          {signal.status || "ACTIVE"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Box label="Entry" value={signal.entry} />
        <Box label="SL" value={signal.sl} red />
        <Box label="TP" value={signal.tp3 || signal.tp2 || signal.tp1 || signal.tp} green />
        <Box label="Score" value={signal.score || signal.confidence || "N/A"} />
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const cls =
    source === "Strategy A"
      ? "bg-blue-400/10 text-blue-300 border-blue-400/30"
      : source === "Strategy B"
      ? "bg-purple-400/10 text-purple-300 border-purple-400/30"
      : source === "Desk 1"
      ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/30"
      : source === "Desk 2"
      ? "bg-orange-400/10 text-orange-300 border-orange-400/30"
      : "bg-slate-400/10 text-slate-300 border-slate-400/30";

  return (
    <span className={`rounded-lg border px-3 py-1 text-xs font-black ${cls}`}>
      {source}
    </span>
  );
}

function Box({
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
    <div className="rounded-2xl bg-black/35 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-1 font-mono text-lg font-black ${
          green ? "text-emerald-400" : red ? "text-red-400" : "text-white"
        }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}

function TopStat({
  title,
  value,
  color,
}: {
  title: string;
  value: any;
  color: "blue" | "green" | "purple" | "gold" | "red";
}) {
  const colors: any = {
    blue: "border-blue-400/20 text-blue-300",
    green: "border-emerald-400/20 text-emerald-300",
    purple: "border-purple-400/20 text-purple-300",
    gold: "border-yellow-400/20 text-yellow-300",
    red: "border-red-400/20 text-red-300",
  };

  return (
    <div className={`rounded-3xl border bg-white/[0.04] p-5 ${colors[color]}`}>
      <p className="text-xs font-black uppercase">{title}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
      <h2 className="mb-5 text-xl font-black">{title}</h2>
      {children}
    </div>
  );
}

function Mini({
  label,
  value,
  green,
}: {
  label: string;
  value: any;
  green?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 font-black ${green ? "text-emerald-400" : "text-white"}`}>
        {String(value).toUpperCase()}
      </p>
    </div>
  );
}

function PerfBox({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: Perf;
}) {
  const tp = data.tpHits || data.wins || 0;
  const sl = data.slHits || data.losses || 0;

  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <div className="flex justify-between gap-3">
        <div>
          <p className="font-black">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <p className="text-lg font-black text-yellow-300">{data.winRate || 0}%</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <Mini label="Active" value={data.activeTrades || 0} />
        <Mini label="TP" value={tp} green />
        <Mini label="SL" value={sl} />
      </div>
    </div>
  );
}

function InfoLine({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="font-black text-yellow-300">{title}</p>
      <p className="mt-1 text-slate-400">{text}</p>
    </div>
  );
}
