"use client";

import { useEffect, useMemo, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

type Signal = {
  id?: string | number;
  source?: string;
  desk?: string;
  strategy?: string;
  pattern?: string;
  symbol: string;
  direction: string;
  entry: string;
  sl: string;
  tp1?: string;
  tp2?: string;
  tp3?: string;
  confidence?: number;
  score?: number;
  status?: string;
  result?: string;
  created_at?: string;
};

type Perf = {
  totalSignalsLogged?: number;
  totalSignals?: number;
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

type NewsEvent = {
  time: string;
  currency: string;
  event: string;
  impact: string;
};

type ClientAccount = {
  id?: string;
  name?: string;
  platform?: string;
  broker?: string;
  account_login?: string;
  status?: string;
  risk_mode?: string;
  max_lot?: number;
  auto_trade_enabled?: boolean;
};

const sourceFilters = [
  "All",
  "Strategy A",
  "Strategy B",
  "Desk 1",
  "Desk 2",
];

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [closed, setClosed] = useState<Signal[]>([]);
  const [performance, setPerformance] = useState<any>({});
  const [deskPerformance, setDeskPerformance] = useState<any>({});
  const [status, setStatus] = useState<any>({});
  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [accountForm, setAccountForm] = useState({
    name: "",
    platform: "MT5",
    broker: "",
    account_login: "",
    risk_mode: "manual",
    max_lot: "0.01",
    consent: false,
  });
  const [accountMessage, setAccountMessage] = useState("");

  async function loadData() {
    try {
      const [
        signalsRes,
        perfRes,
        statusRes,
        closedRes,
        newsRes,
        accountsRes,
        deskPerfRes,
      ] = await Promise.all([
        fetch(`${API}/all-paid-signals`, { cache: "no-store" }),
        fetch(`${API}/strategy-performance`, { cache: "no-store" }),
        fetch(`${API}/system-status`, { cache: "no-store" }),
        fetch(`${API}/closed-signals`, { cache: "no-store" }),
        fetch(`${API}/news-calendar`, { cache: "no-store" }),
        fetch(`${API}/client-accounts`, { cache: "no-store" }),
        fetch(`${API}/desk-performance`, { cache: "no-store" }),
      ]);

      const signalsData = await signalsRes.json();
      const perfData = await perfRes.json();
      const statusData = await statusRes.json();
      const closedData = await closedRes.json();
      const newsData = await newsRes.json();
      const accountsData = await accountsRes.json();
      const deskPerfData = await deskPerfRes.json();

      const allSignals: Signal[] = [
        ...(signalsData.strategyASignals || []),
        ...(signalsData.strategyBSignals || []),
        ...(signalsData.desk1Signals || []),
        ...(signalsData.desk2Signals || []),
      ];

      setSignals(allSignals);
      setPerformance(perfData || {});
      setStatus(statusData || {});
      setClosed(closedData.closedSignals || []);
      setNewsEvents(newsData.events || []);
      setAccounts(accountsData.accounts || []);
      setDeskPerformance(deskPerfData || {});
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function submitAccountConnection() {
    if (!accountForm.name.trim()) {
      setAccountMessage("Please enter your name.");
      return;
    }

    setAccountMessage("Submitting...");

    try {
      const res = await fetch(`${API}/client-accounts/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...accountForm,
          max_lot: Number(accountForm.max_lot),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setAccountMessage("Connection request sent successfully.");
        setAccountForm({
          name: "",
          platform: "MT5",
          broker: "",
          account_login: "",
          risk_mode: "manual",
          max_lot: "0.01",
          consent: false,
        });
        loadData();
      } else {
        setAccountMessage("Failed to submit request.");
      }
    } catch (error) {
      setAccountMessage("Error submitting request.");
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("easypips_client_token");

    if (token && token.length > 20) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }

    loadData();

    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, []);

  const strategyA: Perf = performance?.["Strategy A"] || {};
  const strategyB: Perf = performance?.["Strategy B"] || {};
  const desk1Perf: Perf = deskPerformance?.["Desk 1"] || {};
  const desk2Perf: Perf = deskPerformance?.["Desk 2"] || {};

  const desk1Signals = signals.filter((s) => s.desk === "Desk 1");
  const desk2Signals = signals.filter((s) => s.desk === "Desk 2");

  const tpA = strategyA.tpHits || strategyA.wins || strategyA.tp3Hits || 0;
  const tpB = strategyB.tpHits || strategyB.wins || strategyB.tp3Hits || 0;
  const tpD1 = desk1Perf.tpHits || 0;
  const tpD2 = desk2Perf.tpHits || 0;

  const slA = strategyA.slHits || strategyA.losses || 0;
  const slB = strategyB.slHits || strategyB.losses || 0;
  const slD1 = desk1Perf.slHits || 0;
  const slD2 = desk2Perf.slHits || 0;

  const totalTP = tpA + tpB + tpD1 + tpD2;
  const totalSL = slA + slB + slD1 + slD2;

  const winRate = useMemo(() => {
    const total = totalTP + totalSL;
    return total ? Math.round((totalTP / total) * 100) : 0;
  }, [totalTP, totalSL]);

  const filteredSignals = useMemo(() => {
    if (filter === "All") return signals;
    if (filter === "Desk 1") return signals.filter((s) => s.desk === "Desk 1");
    if (filter === "Desk 2") return signals.filter((s) => s.desk === "Desk 2");
    return signals.filter((s) => s.strategy === filter);
  }, [signals, filter]);

  return (
    <main className="min-h-screen bg-[#05070D] text-white">
      <div className="flex">
        <aside className="hidden min-h-screen w-72 border-r border-white/10 bg-[#080C14] p-5 xl:block">
          <Logo />

          <nav className="mt-8 space-y-2">
            {[
              "Dashboard",
              "Live Signals",
              "Performance",
              "Strategies",
              "News Calendar",
              "Account (MT4/MT5)",
              "History",
              "Reports",
              "Settings",
            ].map((item, index) => (
              <a
                key={item}
                href="#"
                className={`flex items-center rounded-2xl px-4 py-3 text-sm font-bold ${
                  index === 0
                    ? "bg-yellow-400/10 text-yellow-300 ring-1 ring-yellow-400/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl border border-yellow-400/30 bg-yellow-400/5 p-5">
            <p className="text-lg font-black text-yellow-300">Premium AI Signals</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>✓ AI powered strategies</li>
              <li>✓ Desk 1 and Desk 2</li>
              <li>✓ News calendar</li>
              <li>✓ MT4 / MT5 ready</li>
            </ul>
            <a
              href="https://t.me/easypips_signals_bot"
              target="_blank"
              className="mt-5 block rounded-2xl border border-yellow-400/50 px-4 py-3 text-center font-black text-yellow-300 hover:bg-yellow-400 hover:text-black"
            >
              Join Telegram
            </a>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-400">Market Status</p>
            <p className="mt-2 font-black text-emerald-400">OPEN</p>
            <div className="mt-5 h-12 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-400/5" />
            <p className="mt-5 text-sm text-slate-400">System Status</p>
            <p className="mt-2 font-black text-emerald-400">RUNNING</p>
          </div>
        </aside>

        <section className="flex-1">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#05070D]/90 px-5 py-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="xl:hidden">
                <Logo compact />
              </div>

              <div className="hidden items-center gap-6 text-sm font-bold text-slate-300 xl:flex">
                <a className="text-yellow-300" href="#">Dashboard</a>
                <a href="#">Live Signals</a>
                <a href="#">Performance</a>
                <a href="#">Strategies</a>
                <a href="#">News Calendar</a>
                <a href="#">Account</a>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden text-right text-sm sm:block">
                  <p className="text-slate-400">Server Time UTC</p>
                  <p className="font-bold">
                    {status?.serverTimeUTC
                      ? new Date(status.serverTimeUTC).toLocaleString()
                      : "Loading..."}
                  </p>
                </div>

                <a
                  href="https://t.me/easypips_signals_bot"
                  target="_blank"
                  className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black shadow-lg shadow-yellow-400/20"
                >
                  Join Telegram
                </a>
              </div>
            </div>
          </header>

          <div className="space-y-6 p-5">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
              <TopStat title="Total Signals" value={status?.totalSignals || 0} color="blue" />
              <TopStat title="Active Signals" value={status?.activeSignals || 0} color="green" />
              <TopStat title="Closed Trades" value={status?.closedSignals || 0} color="purple" />
              <TopStat title="Win Rate" value={`${winRate}%`} color="gold" />
              <TopStat title="TP Hits" value={totalTP} color="green" />
              <TopStat title="SL Hits" value={totalSL} color="red" />
              <TopStat title="Desk 1" value={desk1Perf.activeTrades || desk1Signals.length} color="green" />
              <TopStat title="Desk 2" value={desk2Perf.activeTrades || desk2Signals.length} color="orange" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <Panel title={`Live Signals (${filteredSignals.length})`}>
                <div className="mb-5 flex flex-wrap gap-2">
                  {sourceFilters.map((item) => (
                    <button
                      key={item}
                      onClick={() => setFilter(item)}
                      className={`rounded-xl px-4 py-2 text-sm font-bold ${
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
                ) : filteredSignals.length === 0 ? (
                  <p className="rounded-2xl bg-black/30 p-6 text-slate-400">
                    No active signals for this filter.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredSignals.map((signal, index) => (
                      <SignalBox key={signal.id || index} signal={signal} />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Economic News Calendar">
                <div className="mb-4 flex gap-2 text-xs font-bold">
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
                        className="grid grid-cols-[55px_55px_1fr_70px] items-center gap-2 rounded-2xl bg-black/30 p-3 text-sm"
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

                <p className="mt-5 text-center text-sm font-bold text-yellow-300">
                  Connected to /news-calendar
                </p>
              </Panel>
            </section>

            <section className="grid gap-6 xl:grid-cols-4">
              <StrategyCard
                title="Strategy A"
                subtitle="EMA + RSI + Momentum"
                color="yellow"
                data={strategyA}
              />
              <StrategyCard
                title="Strategy B"
                subtitle="Fibonacci Pattern"
                color="purple"
                data={strategyB}
              />
              <DeskCard title="Desk 1" data={desk1Perf} color="green" />
              <DeskCard title="Desk 2" data={desk2Perf} color="orange" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
              <Panel title="Performance Overview">
                <div className="flex h-52 items-center justify-center">
                  <div className="flex h-40 w-40 items-center justify-center rounded-full border-[18px] border-emerald-400 border-r-yellow-400">
                    <div className="text-center">
                      <p className="text-3xl font-black">{winRate}%</p>
                      <p className="text-xs text-slate-400">Win Rate</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <Row label="Total Signals" value={status?.totalSignals || 0} />
                  <Row label="Total Closed" value={status?.closedSignals || 0} />
                  <Row label="TP Hits" value={totalTP} green />
                  <Row label="SL Hits" value={totalSL} red />
                </div>
              </Panel>

              <Panel title="Recent Closed Trades">
                {closed.length === 0 ? (
                  <p className="text-slate-400">No closed trades yet.</p>
                ) : (
                  <div className="space-y-3">
                    {closed.slice(0, 5).map((signal, index) => (
                      <div
                        key={signal.id || index}
                        className="flex items-center justify-between rounded-2xl bg-black/30 p-4"
                      >
                        <div>
                          <p className="font-black">{signal.symbol}</p>
                          <p className="text-xs text-slate-400">
                            {signal.direction} · {signal.strategy || signal.desk}
                          </p>
                        </div>
                        <span
                          className={`rounded-xl px-3 py-1 text-xs font-black ${
                            signal.result === "SL"
                              ? "bg-red-400/10 text-red-300"
                              : "bg-emerald-400/10 text-emerald-300"
                          }`}
                        >
                          {signal.result}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Your Trading Accounts">
                {accounts.length === 0 ? (
                  <div className="rounded-2xl bg-black/30 p-4">
                    <p className="font-black">No accounts connected yet</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Client MT4 / MT5 connection requests will appear here.
                    </p>
                  </div>
                ) : (
                  accounts.map((account) => (
                    <AccountBox key={account.id || account.account_login} account={account} />
                  ))
                )}

                <div className="mt-5 space-y-3 rounded-2xl bg-black/30 p-4">
                  <input
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="Your name"
                    value={accountForm.name}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, name: e.target.value })
                    }
                  />

                  <select
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none"
                    value={accountForm.platform}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, platform: e.target.value })
                    }
                  >
                    <option className="bg-[#05070D]" value="MT4">MT4</option>
                    <option className="bg-[#05070D]" value="MT5">MT5</option>
                  </select>

                  <input
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="Broker name"
                    value={accountForm.broker}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, broker: e.target.value })
                    }
                  />

                  <input
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="Account login"
                    value={accountForm.account_login}
                    onChange={(e) =>
                      setAccountForm({
                        ...accountForm,
                        account_login: e.target.value,
                      })
                    }
                  />

                  <select
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none"
                    value={accountForm.risk_mode}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, risk_mode: e.target.value })
                    }
                  >
                    <option className="bg-[#05070D]" value="manual">
                      Manual approval
                    </option>
                    <option className="bg-[#05070D]" value="copy">
                      Copy signals
                    </option>
                  </select>

                  <input
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder="Max lot e.g. 0.01"
                    value={accountForm.max_lot}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, max_lot: e.target.value })
                    }
                  />

                  <label className="flex items-start gap-3 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={accountForm.consent}
                      onChange={(e) =>
                        setAccountForm({
                          ...accountForm,
                          consent: e.target.checked,
                        })
                      }
                      className="mt-1"
                    />
                    <span>
                      I understand that automated trading involves risk, and I
                      give consent for EasyPips to prepare this account for
                      copy-trading after admin approval.
                    </span>
                  </label>

                  <button
                    onClick={submitAccountConnection}
                    className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black"
                  >
                    Request MT4 / MT5 Connection
                  </button>

                  {accountMessage && (
                    <p className="text-center text-sm text-yellow-300">
                      {accountMessage}
                    </p>
                  )}
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-400">
                  Connected to /client-accounts. Auto-copy trading requires
                  client consent, lot-size rules, risk limits, and a kill switch.
                </p>
              </Panel>
            </section>

            <section className="rounded-3xl border border-yellow-400/20 bg-gradient-to-r from-yellow-400/10 to-emerald-400/10 p-6">
              <div className="grid gap-5 xl:grid-cols-[1fr_2fr_1fr] xl:items-center">
                <div>
                  <h2 className="text-2xl font-black">Copy Our Signals Automatically</h2>
                  <p className="mt-2 text-slate-300">
                    Clients will be able to connect MT4 / MT5 and receive signals automatically.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {["Real-time Execution", "Risk Management", "Auto Lot Control", "Secure Access"].map(
                    (item) => (
                      <div key={item} className="rounded-2xl bg-black/30 p-4 text-center text-sm font-bold">
                        {item}
                      </div>
                    )
                  )}
                </div>

                <a
                  href="https://t.me/easypips_signals_bot"
                  target="_blank"
                  className="rounded-2xl bg-yellow-400 px-6 py-4 text-center font-black text-black"
                >
                  Join Telegram
                </a>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black">
        EP
      </div>
      {!compact && (
        <div>
          <h1 className="text-2xl font-black">
            EasyPips <span className="text-yellow-300">AI</span>
          </h1>
          <p className="text-xs text-slate-400">Smart Forex Signals</p>
        </div>
      )}
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
  color: "blue" | "green" | "purple" | "gold" | "red" | "orange";
}) {
  const map: any = {
    blue: "border-blue-400/20 text-blue-300",
    green: "border-emerald-400/20 text-emerald-300",
    purple: "border-purple-400/20 text-purple-300",
    gold: "border-yellow-400/20 text-yellow-300",
    red: "border-red-400/20 text-red-300",
    orange: "border-orange-400/20 text-orange-300",
  };

  return (
    <div className={`rounded-3xl border bg-white/[0.04] p-5 ${map[color]}`}>
      <p className="text-xs font-black uppercase">{title}</p>
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <div className="mt-4 h-8 rounded-xl bg-gradient-to-r from-current/30 to-transparent opacity-70" />
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
      <h2 className="mb-5 text-lg font-black">{title}</h2>
      {children}
    </div>
  );
}

function SignalBox({ signal }: { signal: Signal }) {
  const isBuy = signal.direction?.toUpperCase() === "BUY";
  const source = signal.desk || signal.strategy || signal.source || "Signal";
  const badge = getBadge(source);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0A101C] p-5 transition hover:-translate-y-1 hover:border-yellow-400/40">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400">{signal.pattern || "AI Engine"}</p>
          <h3 className="mt-1 text-2xl font-black">{signal.symbol}</h3>
        </div>

        <span
          className={`rounded-xl px-3 py-1 text-xs font-black ${
            isBuy ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"
          }`}
        >
          {signal.direction}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className={`rounded-lg px-3 py-1 text-xs font-black ${badge}`}>
          {source}
        </span>
        <span className="text-xs text-emerald-400">{signal.status || "ACTIVE"}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Box label="Entry" value={signal.entry} />
        <Box label="SL" value={signal.sl} red />
        <Box label="TP1" value={signal.tp1} green />
        <Box label="TP2" value={signal.tp2} green />
        <Box label="TP3" value={signal.tp3} green />
        <Box label="Score" value={signal.score || signal.confidence || "N/A"} />
      </div>
    </div>
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

function StrategyCard({
  title,
  subtitle,
  data,
  color,
}: {
  title: string;
  subtitle: string;
  data: Perf;
  color: "yellow" | "purple";
}) {
  const tp = data.tpHits || data.wins || data.tp3Hits || 0;
  const sl = data.slHits || data.losses || 0;

  return (
    <Panel title={title}>
      <p className="text-sm text-slate-400">{subtitle}</p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Mini label="Active" value={data.activeTrades || 0} />
        <Mini label="TP" value={tp} green />
        <Mini label="SL" value={sl} red />
      </div>
      <div className="mt-5 rounded-2xl bg-black/30 p-4">
        <p className={color === "yellow" ? "text-yellow-300" : "text-purple-300"}>
          Win Rate
        </p>
        <p className="mt-2 text-3xl font-black">{data.winRate || 0}%</p>
      </div>
    </Panel>
  );
}

function DeskCard({
  title,
  data,
  color,
}: {
  title: string;
  data: Perf;
  color: "green" | "orange";
}) {
  return (
    <Panel title={title}>
      <p className="text-sm text-slate-400">Manual trading desk</p>
      <p className={`mt-5 text-4xl font-black ${color === "green" ? "text-emerald-400" : "text-orange-400"}`}>
        {data.activeTrades || 0}
      </p>
      <p className="mt-2 text-sm text-slate-400">Active signals</p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Mini label="TP" value={data.tpHits || 0} green />
        <Mini label="SL" value={data.slHits || 0} red />
        <Mini label="Win" value={`${data.winRate || 0}%`} />
      </div>
    </Panel>
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
    <div className="rounded-2xl bg-black/30 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black ${green ? "text-emerald-400" : red ? "text-red-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function Row({
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
    <div className="flex justify-between border-b border-white/10 py-2">
      <span className="text-slate-400">{label}</span>
      <span className={green ? "text-emerald-400" : red ? "text-red-400" : "text-white"}>
        {value}
      </span>
    </div>
  );
}

function AccountBox({ account }: { account: ClientAccount }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-2xl bg-black/30 p-4">
      <div>
        <p className="font-black">{account.platform || "MT"} Account</p>
        <p className="text-xs text-slate-400">
          {account.name || "Client"} · {account.broker || "Broker not set"}
        </p>
        <p className="text-xs text-emerald-400">
          Status: {account.status || "pending"} · Auto:{" "}
          {account.auto_trade_enabled ? "ON" : "OFF"}
        </p>
      </div>
      <p className="text-3xl font-black">{account.platform || "MT"}</p>
    </div>
  );
}

function getBadge(source: string) {
  if (source === "Strategy A") return "bg-blue-400/10 text-blue-300 border border-blue-400/30";
  if (source === "Strategy B") return "bg-purple-400/10 text-purple-300 border border-purple-400/30";
  if (source === "Desk 1") return "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30";
  if (source === "Desk 2") return "bg-orange-400/10 text-orange-300 border border-orange-400/30";
  return "bg-slate-400/10 text-slate-300 border border-slate-400/30";
}
