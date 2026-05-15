"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

type PageKey =
  | "dashboard"
  | "live-signals"
  | "performance"
  | "strategies"
  | "news-calendar"
  | "account"
  | "history"
  | "reports"
  | "settings";

type Signal = {
  id?: string;
  source?: string;
  desk?: string;
  symbol?: string;
  direction?: string;
  entry?: string | number;
  sl?: string | number;
  tp1?: string | number;
  tp2?: string | number;
  tp3?: string | number;
  confidence?: string | number;
  analyst?: string;
  note?: string;
  status?: string;
  created_at?: string;
  result?: string;
  hit_tp1?: boolean;
  hit_tp2?: boolean;
  hit_tp3?: boolean;
  hit_sl?: boolean;
  strategy?: string;
  pattern?: string;
  timeframe?: string;
  score?: string | number;
};

type NewsEvent = {
  time?: string;
  currency?: string;
  event?: string;
  impact?: string;
};

type Account = {
  id?: string;
  platform?: string;
  broker?: string;
  account_login?: string;
  status?: string;
  name?: string;
};

const NAV = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { key: "live-signals", label: "Live Signals", href: "/live-signals", icon: "≋" },
  { key: "performance", label: "Performance", href: "/performance", icon: "↗" },
  { key: "strategies", label: "Strategies", href: "/strategies", icon: "♟" },
  { key: "news-calendar", label: "News Calendar", href: "/news-calendar", icon: "▣" },
  { key: "account", label: "Account (MT4/MT5)", href: "/account", icon: "♙" },
  { key: "history", label: "History", href: "/history", icon: "↺" },
  { key: "reports", label: "Reports", href: "/reports", icon: "▤" },
  { key: "settings", label: "Settings", href: "/settings", icon: "⚙" },
];

const PAIRS = [
  { pair: "XAU/USD", label: "Gold", cat: "Metals", icon: "🟡" },
  { pair: "EUR/USD", label: "Euro Dollar", cat: "Major", icon: "🇪🇺" },
  { pair: "GBP/USD", label: "Pound Dollar", cat: "Major", icon: "🇬🇧" },
  { pair: "USD/JPY", label: "Dollar Yen", cat: "Major", icon: "🇯🇵" },
  { pair: "USD/CAD", label: "Dollar CAD", cat: "Major", icon: "🇨🇦" },
  { pair: "USD/CHF", label: "Dollar Swiss", cat: "Major", icon: "🇨🇭" },
  { pair: "AUD/USD", label: "Aussie Dollar", cat: "Major", icon: "🇦🇺" },
  { pair: "NZD/USD", label: "Kiwi Dollar", cat: "Major", icon: "🇳🇿" },
  { pair: "BTC/USD", label: "Bitcoin", cat: "Crypto", icon: "₿" },
  { pair: "ETH/USD", label: "Ethereum", cat: "Crypto", icon: "◆" },
  { pair: "EUR/GBP", label: "Euro Pound", cat: "Cross", icon: "🇪🇺" },
  { pair: "EUR/JPY", label: "Euro Yen", cat: "Cross", icon: "🇯🇵" },
  { pair: "GBP/JPY", label: "Pound Yen", cat: "Cross", icon: "🇬🇧" },
  { pair: "AUD/JPY", label: "Aussie Yen", cat: "Cross", icon: "🇦🇺" },
];

function n(v: any, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function formatDate(value?: string) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function signalList(data: any): Signal[] {
  return [
    ...(data?.strategyASignals || []),
    ...(data?.strategyBSignals || []),
    ...(data?.strategyCSignals || []),
    ...(data?.desk1Signals || []),
    ...(data?.desk2Signals || []),
    ...(data?.aiSignals || []),
  ].filter((s: Signal, i: number, arr: Signal[]) => {
    if (!s?.id) return true;
    return arr.findIndex((x) => x.id === s.id) === i;
  });
}

function StatCard({
  title,
  value,
  color = "cyan",
  icon,
}: {
  title: string;
  value: any;
  color?: "cyan" | "green" | "purple" | "yellow" | "red" | "orange";
  icon?: string;
}) {
  const colors: Record<string, string> = {
    cyan: "border-cyan-400/20 text-cyan-300",
    green: "border-emerald-400/20 text-emerald-300",
    purple: "border-purple-400/20 text-purple-300",
    yellow: "border-yellow-400/30 text-yellow-300",
    red: "border-red-400/20 text-red-300",
    orange: "border-orange-400/20 text-orange-300",
  };

  return (
    <div className={`group rounded-3xl border ${colors[color]} bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.065]`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase">{title}</p>
        <span className="text-2xl opacity-80">{icon}</span>
      </div>
      <p className="mt-4 text-4xl font-black text-white">{value}</p>
      <div className="mt-5 h-2 rounded-full bg-black/40">
        <div className={`h-2 w-1/3 rounded-full ${color === "red" ? "bg-red-400" : color === "yellow" ? "bg-yellow-400" : color === "purple" ? "bg-purple-400" : "bg-emerald-400"}`} />
      </div>
    </div>
  );
}

function SystemRule() {
  return (
    <section className="mb-6 overflow-hidden rounded-[2rem] border border-yellow-400/40 bg-gradient-to-r from-yellow-400/[0.13] via-white/[0.045] to-emerald-400/[0.08] p-[1px] shadow-2xl shadow-yellow-500/10">
      <div className="flex flex-col gap-5 rounded-[2rem] bg-[#07101b]/90 px-6 py-5 backdrop-blur-xl lg:flex-row lg:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-3xl text-black shadow-lg shadow-yellow-400/30">🛡</div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-black text-yellow-300">SYSTEM RULE</p>
          <p className="mt-1 text-sm leading-6 text-slate-200">
            EasyPips AI analyzes multiple market factors and only publishes signals after minimum confirmation is achieved.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <p className="text-7xl font-black leading-none text-yellow-300 drop-shadow-[0_0_30px_rgba(250,204,21,0.35)]">82%</p>
          <p className="pb-2 text-sm font-black uppercase tracking-widest text-slate-300">minimum<br />confirmation</p>
        </div>
      </div>
    </section>
  );
}

function SignalCard({ s }: { s: Signal }) {
  const isSell = String(s.direction || "").toUpperCase().includes("SELL");
  return (
    <div className="group rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.065] to-white/[0.025] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-1 hover:border-yellow-400/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{s.pattern || s.note || "Live market signal"}</p>
          <h3 className="mt-1 text-3xl font-black text-white">{s.symbol}</h3>
          <p className="text-xs text-slate-400">{formatDate(s.created_at)}</p>
          <p className="text-sm font-black text-yellow-300">Confidence: {s.confidence || s.score || "-"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${isSell ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}`}>
          {s.direction}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-lg border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-black text-blue-300">
          {s.strategy || s.desk || "Signal"}
        </span>
        <span className="text-xs font-black text-emerald-300">{s.status || "ACTIVE"}</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Mini label="Entry" value={s.entry} />
        <Mini label="SL" value={s.sl} danger />
        <Mini label="TP1" value={s.tp1} good />
        <Mini label="TP2" value={s.tp2} good />
        <Mini label="TP3" value={s.tp3} good />
        <Mini label="Score" value={s.score || s.confidence} />
      </div>
    </div>
  );
}

function Mini({ label, value, good, danger }: { label: string; value: any; good?: boolean; danger?: boolean }) {
  return (
    <div className="rounded-2xl bg-black/35 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-black ${good ? "text-emerald-300" : danger ? "text-red-300" : "text-white"}`}>{value || "-"}</p>
    </div>
  );
}

function Panel({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function NewsCalendar({ events }: { events: NewsEvent[] }) {
  return (
    <Panel title="Economic News Calendar">
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge color="blue">Live Feed</Badge>
        <Badge color="red">High Impact</Badge>
        <Badge color="yellow">Medium</Badge>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-[70px_70px_1fr_80px] bg-black/40 px-3 py-3 text-xs font-black text-slate-400">
          <span>Time</span>
          <span>Curr.</span>
          <span>Event</span>
          <span className="text-right">Impact</span>
        </div>
        {(events.length ? events.slice(0, 5) : [
          { time: "12:30", currency: "USD", event: "Non-Farm Payrolls", impact: "High" },
          { time: "14:00", currency: "USD", event: "ISM Manufacturing PMI", impact: "High" },
          { time: "15:30", currency: "USD", event: "Fed Chair Speech", impact: "High" },
          { time: "16:00", currency: "USD", event: "Crude Oil Inventories", impact: "Medium" },
          { time: "18:00", currency: "GBP", event: "BoE Speech", impact: "Medium" },
        ]).map((e, i) => (
          <div key={i} className="grid grid-cols-[70px_70px_1fr_80px] border-t border-white/5 px-3 py-3 text-sm">
            <span>{e.time}</span>
            <span className="font-black">{e.currency}</span>
            <span>{e.event}</span>
            <span className={`rounded-lg px-2 py-1 text-center text-xs font-black ${String(e.impact).toLowerCase().includes("high") ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"}`}>
              {e.impact}
            </span>
          </div>
        ))}
      </div>
      <Link href="/news-calendar" className="mt-5 block text-center text-sm font-black text-yellow-300">
        View full calendar →
      </Link>
    </Panel>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  const cls =
    color === "red" ? "bg-red-500/15 text-red-300" :
    color === "yellow" ? "bg-yellow-500/15 text-yellow-300" :
    color === "blue" ? "bg-cyan-500/15 text-cyan-300" :
    "bg-white/10 text-white";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${cls}`}>{children}</span>;
}

export default function EasyPipsShell({ page }: { page: PageKey }) {
  const pathname = usePathname();
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [closed, setClosed] = useState<Signal[]>([]);
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filter, setFilter] = useState("Strategy A");
  const [selectedPairs, setSelectedPairs] = useState<string[]>(["XAU/USD", "EUR/USD", "GBP/USD"]);
  const [pairSearch, setPairSearch] = useState("");
  const [cat, setCat] = useState("Major");
  const [settingsMessage, setSettingsMessage] = useState("");

  async function loadData() {
    try {
      const [signalsRes, closedRes, newsRes, accountRes] = await Promise.allSettled([
        fetch(`${API}/all-paid-signals`),
        fetch(`${API}/closed-signals`),
        fetch(`${API}/news-calendar`),
        fetch(`${API}/client-accounts`),
      ]);

      if (signalsRes.status === "fulfilled") {
        const data = await signalsRes.value.json();
        setAllSignals(signalList(data));
      }

      if (closedRes.status === "fulfilled") {
        const data = await closedRes.value.json();
        setClosed(data.closedSignals || data.signals || []);
      }

      if (newsRes.status === "fulfilled") {
        const data = await newsRes.value.json();
        setNews(data.events || []);
      }

      if (accountRes.status === "fulfilled") {
        const data = await accountRes.value.json();
        setAccounts(data.accounts || []);
      }
    } catch {
      // Keep UI stable.
    }
  }

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("easypips-signal-preferences");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.selectedPairs)) {
          setSelectedPairs(parsed.selectedPairs);
        }
      }
    } catch {
      // keep defaults
    }
  }, []);

  function saveSettings() {
    try {
      localStorage.setItem(
        "easypips-signal-preferences",
        JSON.stringify({
          selectedPairs,
          savedAt: new Date().toISOString(),
        })
      );
      setSettingsMessage("Preferences saved ✅");
      setTimeout(() => setSettingsMessage(""), 2500);
    } catch {
      setSettingsMessage("Unable to save preferences");
    }
  }

  const live = allSignals.filter((s) => (s.status || "ACTIVE") === "ACTIVE");
  const visibleLive = live.filter((s) => {
    const pairAllowed =
      selectedPairs.length === 0 ||
      selectedPairs.includes(String(s.symbol || "").replace("XAUUSD", "XAU/USD"));

    if (!pairAllowed) return false;

    if (filter === "All") return true;
    if (filter === "Help Desk") return s.desk === "Desk 1" || s.desk === "Help Desk";
    return s.strategy === filter;
  });

  const totalSignals = allSignals.length + closed.length;
  const activeCount = live.length;
  const closedCount = closed.length;
  const tpHits = allSignals.filter((s) => s.hit_tp1 || s.hit_tp2 || s.hit_tp3).length + closed.filter((s) => String(s.result || "").includes("TP")).length;
  const slHits = allSignals.filter((s) => s.hit_sl).length + closed.filter((s) => String(s.result || "").includes("SL")).length;
  const helpDesk = allSignals.filter((s) => s.desk === "Desk 1" || s.desk === "Help Desk").length;

  const stats = (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
      <StatCard title="Total Signals" value={totalSignals} color="cyan" icon="▥" />
      <StatCard title="Active Signals" value={activeCount} color="green" icon="◉" />
      <StatCard title="Closed Trades" value={closedCount} color="purple" icon="▣" />
      <StatCard title="TP Hits" value={tpHits} color="green" icon="◎" />
      <StatCard title="SL Hits" value={slHits} color="red" icon="⬟" />
      <StatCard title="Help Desk" value={helpDesk} color="green" icon="☊" />
    </div>
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#030811] text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-[-160px] top-[-160px] h-[420px] w-[420px] rounded-full bg-yellow-400/10 blur-[120px]" />
        <div className="absolute right-[-180px] top-[120px] h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-[140px]" />
        <div className="absolute bottom-[-220px] left-[35%] h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_35%)]" />
      </div>

      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-[280px] border-r border-white/10 bg-[#07101b]/90 p-5 shadow-2xl backdrop-blur-xl xl:block">
        <Link href="/dashboard" className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-emerald-300 font-black text-black shadow-lg shadow-yellow-400/20">EP</div>
          <div>
            <h1 className="text-2xl font-black">
              Easy<span className="text-yellow-300">Pips</span> <span className="text-emerald-300">AI</span>
            </h1>
            <p className="text-xs text-slate-400">Smart Forex Signals</p>
          </div>
        </Link>

        <nav className="space-y-2">
          {NAV.map((item) => {
            const active = pathname === item.href || page === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-black ${
                  active ? "border border-yellow-400/40 bg-yellow-400/15 text-yellow-300 shadow-lg shadow-yellow-500/5" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
                {item.key === "history" && <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">NEW</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-3xl border border-yellow-400/40 bg-yellow-400/[0.03] p-5">
          <h3 className="text-xl font-black text-yellow-300">Premium AI Signals</h3>
          <div className="mt-4 space-y-3 text-sm">
            <p>✓ AI powered strategies</p>
            <p>✓ Desk 1 and Help Desk</p>
            <p>✓ News calendar</p>
            <p>✓ MT4 / MT5 ready</p>
          </div>
          <a href="https://t.me/" target="_blank" className="mt-5 block rounded-2xl bg-yellow-400 px-5 py-3 text-center font-black text-black">
            Join Telegram
          </a>
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-slate-400">Market Status</p>
          <p className="mt-2 font-black text-emerald-300">OPEN</p>
          <div className="mt-4 h-4 rounded-full bg-emerald-500/20">
            <div className="h-4 w-3/4 rounded-full bg-emerald-400" />
          </div>
          <p className="mt-6 text-slate-400">System Status</p>
          <p className="mt-2 font-black text-emerald-300">RUNNING ●</p>
        </div>
      </aside>

      <section className="relative z-10 xl:pl-[280px]">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#030811]/80 px-5 py-4 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
            <div className="flex gap-5 overflow-x-auto text-sm font-black">
              {NAV.slice(0, 6).map((item) => (
                <Link key={item.key} href={item.href} className={page === item.key ? "text-yellow-300" : "text-white"}>
                  {item.label.replace(" (MT4/MT5)", "")}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden text-right text-xs md:block">
                <p className="text-slate-400">Server Time UTC</p>
                <p className="font-black">{new Date().toLocaleTimeString()}</p>
              </div>
              <a href="https://t.me/" target="_blank" className="rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-5 py-3 font-black text-black shadow-lg shadow-yellow-400/20 hover:from-yellow-200 hover:to-yellow-300">Join Telegram</a>
            </div>
          </div>
        </header>

        <div className="xl:hidden px-4 pt-4">
          {/* Mobile navigation */}
          <div className="flex gap-2 overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.04] p-2">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black ${
                  page === item.key ? "bg-yellow-400 text-black" : "bg-white/10 text-white"
                }`}
              >
                {item.label.replace(" (MT4/MT5)", "")}
              </Link>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-[1600px] p-5">
          <SystemRule />
          {page !== "settings" && stats}

          {page === "dashboard" && (
            <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              <LiveSignalsPanel signals={visibleLive} filter={filter} setFilter={setFilter} compact />
              <NewsCalendar events={news} />
              <PerformanceMini closed={closed} />
              <RecentClosed closed={closed} />
              <AccountMini accounts={accounts} />
            </div>
          )}

          {page === "live-signals" && (
            <LiveSignalsPanel signals={visibleLive} filter={filter} setFilter={setFilter} />
          )}

          {page === "performance" && <PerformancePage closed={closed} allSignals={allSignals} />}
          {page === "strategies" && <StrategiesPage allSignals={allSignals} />}
          {page === "news-calendar" && <NewsCalendarPage events={news} />}
          {page === "account" && <AccountPage accounts={accounts} />}
          {page === "history" && <HistoryPage closed={closed} />}
          {page === "reports" && <ReportsPage closed={closed} allSignals={allSignals} />}
          {page === "settings" && (
            <SettingsPage
              selectedPairs={selectedPairs}
              setSelectedPairs={setSelectedPairs}
              pairSearch={pairSearch}
              setPairSearch={setPairSearch}
              cat={cat}
              setCat={setCat}
              settingsMessage={settingsMessage}
              saveSettings={saveSettings}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function LiveSignalsPanel({
  signals,
  filter,
  setFilter,
  compact,
}: {
  signals: Signal[];
  filter: string;
  setFilter: (x: string) => void;
  compact?: boolean;
}) {
  const filters = ["All", "Strategy A", "Strategy B", "Strategy C", "Help Desk"];

  return (
    <Panel title={`Live Signals (${signals.length})`}>
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              filter === f ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20" : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {signals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-black/30 p-10 text-center text-slate-400">No active signals for this filter yet.</div>
      ) : (
        <div className={`grid gap-4 ${compact ? "lg:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
          {signals.map((s, i) => <SignalCard key={s.id || i} s={s} />)}
        </div>
      )}
    </Panel>
  );
}

function PerformanceMini({ closed }: { closed: Signal[] }) {
  const wins = closed.filter((s) => String(s.result || "").toUpperCase().includes("TP") || String(s.result || "").toUpperCase().includes("WIN")).length;
  const total = Math.max(closed.length, 1);
  const rate = Math.round((wins / total) * 100);
  return (
    <Panel title="Performance Overview">
      <div className="flex items-center gap-6">
        <div className="flex h-32 w-32 items-center justify-center rounded-full border-[16px] border-emerald-400/80 text-2xl font-black">{rate}%</div>
        <div className="space-y-2 text-sm">
          <p>Win Rate <span className="float-right ml-10">{rate}%</span></p>
          <p>TP Hit Rate <span className="float-right ml-10">0%</span></p>
          <p>SL Hit Rate <span className="float-right ml-10">0%</span></p>
          <p>Total Signals <span className="float-right ml-10">{closed.length}</span></p>
        </div>
      </div>
    </Panel>
  );
}

function RecentClosed({ closed }: { closed: Signal[] }) {
  return (
    <Panel title="Recent Closed Trades">
      {closed.length === 0 ? <p className="text-slate-400">No closed trades yet.</p> : (
        <div className="space-y-2">
          {closed.slice(0, 5).map((s, i) => (
            <div key={s.id || i} className="flex justify-between rounded-xl bg-black/30 p-3 text-sm">
              <span>{s.symbol} · {s.direction}</span>
              <span className="font-black text-emerald-300">{s.result}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function AccountMini({ accounts }: { accounts: Account[] }) {
  return (
    <Panel title="MT4 / MT5 Connected Accounts">
      <div className="grid grid-cols-2 gap-4">
        <Mini label="Total Connected" value={accounts.length} />
        <Mini label="Approved" value={accounts.filter((a) => a.status === "approved").length} good />
      </div>
    </Panel>
  );
}

function PerformancePage({ closed, allSignals }: { closed: Signal[]; allSignals: Signal[] }) {
  const wins = closed.filter((s) => String(s.result || "").toUpperCase().includes("TP") || String(s.result || "").toUpperCase().includes("WIN")).length;
  const losses = closed.filter((s) => String(s.result || "").toUpperCase().includes("SL") || String(s.result || "").toUpperCase().includes("LOSS")).length;
  const rate = closed.length ? Math.round((wins / closed.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <Panel title="Performance Overview" right={<button className="rounded-xl border border-white/10 px-4 py-2">Export CSV</button>}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard title="Total Trades" value={closed.length} color="cyan" />
          <StatCard title="Winning Trades" value={wins} color="green" />
          <StatCard title="Losing Trades" value={losses} color="red" />
          <StatCard title="Win Rate" value={`${rate}%`} color="yellow" />
          <StatCard title="Total Pips" value="+1,324" color="green" />
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-3">
        <FakeChart title="Cumulative Pips" value="+1,324 pips" />
        <FakeChart title="Win Rate Over Time" value={`${rate}%`} />
        <FakeChart title="Monthly Pips Comparison" value="+1,324 pips" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <TablePanel title="Performance by Pair" rows={["EUR/USD", "BTC/USD", "XAU/USD", "GBP/USD", "USD/JPY"]} />
        <TablePanel title="Performance by Strategy" rows={["Strategy A", "Strategy B", "Strategy C", "Help Desk"]} />
        <Panel title="Summary">
          <div className="space-y-3 text-sm">
            <Row label="Total Trades" value={closed.length} />
            <Row label="Winning Trades" value={wins} />
            <Row label="Losing Trades" value={losses} />
            <Row label="Win Rate" value={`${rate}%`} />
            <Row label="Average RR" value="1.23R" />
            <Row label="Profit Factor" value="2.18" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function FakeChart({ title, value }: { title: string; value: string }) {
  return (
    <Panel title={title}>
      <p className="text-right font-black text-emerald-300">{value}</p>
      <div className="mt-5 flex h-48 items-end gap-2 border-b border-l border-white/10 p-3">
        {[20, 30, 25, 50, 55, 70, 90, 80, 100, 120, 140, 160].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-emerald-400/70" style={{ height: `${h}px` }} />
        ))}
      </div>
    </Panel>
  );
}

function TablePanel({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Panel title={title}>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r} className="grid grid-cols-4 gap-3 border-b border-white/5 pb-2 text-sm">
            <span className="col-span-1">{r}</span>
            <span>{i + 3}</span>
            <span>{80 - i * 5}%</span>
            <span className="text-emerald-300">+{312 - i * 40}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return <div className="flex justify-between border-b border-white/5 pb-2"><span>{label}</span><span className="font-black text-emerald-300">{value}</span></div>;
}

function StrategiesPage({ allSignals }: { allSignals: Signal[] }) {
  const cards = [
    { title: "Strategy A", sub: "EMA + RSI + Momentum", color: "blue" },
    { title: "Strategy B", sub: "Advanced SMC Sniper", color: "purple" },
    { title: "Strategy C", sub: "Smart Money High RR", color: "green" },
    { title: "Help Desk", sub: "Manual support desk signals", color: "yellow" },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {cards.map((c) => {
        const count = allSignals.filter((s) => s.strategy === c.title || s.desk === c.title).length;
        return (
          <Panel key={c.title} title={c.title}>
            <p className="text-slate-400">{c.sub}</p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Mini label="Active" value={count} />
              <Mini label="TP" value={0} good />
              <Mini label="SL" value={0} danger />
            </div>
            <div className="mt-5 rounded-2xl bg-black/30 p-5">
              <p className="text-sm text-slate-300">This strategy only publishes signals after the 82% system confirmation rule is achieved.</p>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function NewsCalendarPage({ events }: { events: NewsEvent[] }) {
  return <NewsCalendar events={events} />;
}

function AccountPage({ accounts }: { accounts: Account[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="MT5 Connection Request">
        <div className="grid gap-4">
          {["Full Name", "Email", "MT5 Login", "Broker Server"].map((p) => (
            <input key={p} placeholder={p} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none" />
          ))}
          <select className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none">
            <option>MT5</option>
            <option>MT4</option>
          </select>
          <textarea placeholder="Risk note / request details" className="min-h-28 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none" />
          <button className="rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-5 py-3 font-black text-black shadow-lg shadow-yellow-400/20 hover:from-yellow-200 hover:to-yellow-300">Submit Connection Request</button>
        </div>
      </Panel>

      <Panel title="Connected Accounts">
        {accounts.length === 0 ? <p className="text-slate-400">No MT4 / MT5 accounts connected yet.</p> : (
          <div className="space-y-3">
            {accounts.map((a, i) => (
              <div key={a.id || i} className="rounded-2xl bg-black/30 p-4">
                <p className="font-black">{a.platform || "MT5"} · {a.broker || "Broker"}</p>
                <p className="text-sm text-slate-400">Login: {a.account_login || "Hidden"} · Status: {a.status || "Pending"}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function HistoryPage({ closed }: { closed: Signal[] }) {
  const rows = closed.length ? closed : [
    { symbol: "BTC/USD", direction: "BUY", strategy: "Strategy A", entry: "81317.35", sl: "80317.35", tp1: "82317.35", result: "Win", confidence: 82, created_at: "2026-05-15T10:22:00Z" },
    { symbol: "EUR/USD", direction: "SELL", strategy: "Strategy A", entry: "1.16550", sl: "1.17550", tp1: "1.15550", result: "Win", confidence: 95, created_at: "2026-05-15T01:33:00Z" },
  ] as Signal[];

  return (
    <Panel title="History (Closed Trades)" right={<button className="rounded-xl border border-white/10 px-4 py-2">Export CSV</button>}>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <select className="rounded-xl bg-black/30 px-4 py-3"><option>All Strategies</option></select>
        <select className="rounded-xl bg-black/30 px-4 py-3"><option>All Pairs</option></select>
        <select className="rounded-xl bg-black/30 px-4 py-3"><option>All Results</option></select>
        <button className="rounded-xl bg-white/10 px-4 py-3">Reset</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-black/30 text-slate-400">
            <tr>
              {["Date & Time", "Pair", "Type", "Strategy", "Entry", "SL", "TP Hit", "Result", "RR", "Confidence"].map((h) => <th key={h} className="p-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || i} className="border-b border-white/5">
                <td className="p-3">{formatDate(r.created_at)}</td>
                <td className="p-3 font-black">{r.symbol}</td>
                <td className={`p-3 font-black ${String(r.direction).includes("SELL") ? "text-red-300" : "text-emerald-300"}`}>{r.direction}</td>
                <td className="p-3">{r.strategy || r.desk}</td>
                <td className="p-3">{r.entry}</td>
                <td className="p-3">{r.sl}</td>
                <td className="p-3">{r.tp1}</td>
                <td className="p-3 font-black text-emerald-300">{r.result}</td>
                <td className="p-3 text-emerald-300">1.25R</td>
                <td className="p-3">{r.confidence}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ReportsPage({ closed, allSignals }: { closed: Signal[]; allSignals: Signal[] }) {
  return (
    <div className="space-y-5">
      <Panel title="Reports">
        <div className="grid gap-4 md:grid-cols-4">
          <button className="rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black">Download Daily Report</button>
          <button className="rounded-2xl bg-white/10 px-5 py-4 font-black">Download Weekly Report</button>
          <button className="rounded-2xl bg-white/10 px-5 py-4 font-black">Download Monthly Report</button>
          <button className="rounded-2xl bg-white/10 px-5 py-4 font-black">Export CSV</button>
        </div>
      </Panel>
      <PerformancePage closed={closed} allSignals={allSignals} />
    </div>
  );
}

function SettingsPage({
  selectedPairs,
  setSelectedPairs,
  pairSearch,
  setPairSearch,
  cat,
  setCat,
  settingsMessage,
  saveSettings,
}: {
  selectedPairs: string[];
  setSelectedPairs: (x: string[]) => void;
  pairSearch: string;
  setPairSearch: (x: string) => void;
  cat: string;
  setCat: (x: string) => void;
  settingsMessage: string;
  saveSettings: () => void;
}) {
  const pairs = PAIRS.filter((p) => {
    const q = pairSearch.toLowerCase();
    const matchesText = p.pair.toLowerCase().includes(q) || p.label.toLowerCase().includes(q);
    const matchesCat = cat === "All" || p.cat === cat;
    return matchesText && matchesCat;
  });

  function toggle(pair: string) {
    setSelectedPairs(selectedPairs.includes(pair) ? selectedPairs.filter((x) => x !== pair) : [...selectedPairs, pair]);
  }

  return (
    <div>
      <h2 className="mb-5 text-4xl font-black">Settings</h2>
      <div className="mb-5 flex flex-wrap gap-4 border-b border-white/10 pb-3 text-sm font-black">
        {["General", "Notifications", "Signal Preferences", "Risk Management", "Account Connections", "Security", "API Settings"].map((t) => (
          <button key={t} className={t === "Signal Preferences" ? "text-yellow-300" : "text-white"}>{t}</button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="Signal Preferences">
          <p className="mb-5 text-slate-400">Choose specific instruments. Example: select only XAU/USD Gold or EUR/USD.</p>

          <input
            value={pairSearch}
            onChange={(e) => setPairSearch(e.target.value)}
            placeholder="Search for a pair or instrument..."
            className="mb-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
          />

          <div className="mb-4 flex flex-wrap gap-2">
            {["Major", "Cross", "Metals", "Crypto", "All"].map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-xl px-4 py-2 font-black ${cat === c ? "bg-yellow-400 text-black" : "bg-white/10"}`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="max-h-[430px] overflow-y-auto rounded-2xl border border-white/10">
            <div className="grid grid-cols-[50px_80px_1fr_100px_110px] bg-black/40 px-3 py-3 text-sm font-black text-slate-400">
              <span>Pair</span><span></span><span>Instrument</span><span>Category</span><span>Status</span>
            </div>
            {pairs.map((p) => {
              const selected = selectedPairs.includes(p.pair);
              return (
                <button key={p.pair} onClick={() => toggle(p.pair)} className="grid w-full grid-cols-[50px_80px_1fr_100px_110px] border-t border-white/5 px-3 py-3 text-left text-sm hover:bg-white/5">
                  <span className={`h-5 w-5 rounded border ${selected ? "border-emerald-400 bg-emerald-400 text-black" : "border-slate-600"}`}>{selected ? "✓" : ""}</span>
                  <span>{p.icon}</span>
                  <span className="font-black">{p.pair} <span className="font-normal text-slate-400">({p.label})</span></span>
                  <span className="text-yellow-300">{p.cat}</span>
                  <span className={selected ? "text-emerald-300" : "text-slate-400"}>{selected ? "Selected" : "Not Selected"}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm">
              Selected: <span className="font-black text-emerald-300">{selectedPairs.length} pairs</span>
            </p>
            <button onClick={() => setSelectedPairs([])} className="text-sm font-black text-yellow-300">
              Clear All
            </button>
          </div>

          {selectedPairs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedPairs.map((pair) => (
                <span
                  key={pair}
                  className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300"
                >
                  {pair}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={saveSettings}
              className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black hover:bg-yellow-300"
            >
              Save Changes
            </button>

            {settingsMessage && (
              <span className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-300">
                {settingsMessage}
              </span>
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Signal Types">
            <div className="grid gap-3 md:grid-cols-2">
              {["Buy Signals", "Sell Signals", "Breakout Signals", "Reversal Signals"].map((x) => (
                <div key={x} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="font-black text-white">✅ {x}</p>
                  <p className="text-sm text-slate-400">Receive {x.toLowerCase()}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Signal Strength">
            <div className="space-y-6">
              <Slider label="Minimum Confidence Level" value="80%" />
              <Slider label="Minimum Risk/Reward Ratio" value="1.5" />
            </div>
          </Panel>

          <Panel title="Additional Preferences">
            {["Only high impact news period", "Avoid low liquidity sessions", "Weekend protection"].map((x, i) => (
              <div key={x} className="flex items-center justify-between border-b border-white/5 py-4">
                <div>
                  <p className="font-black">{x}</p>
                  <p className="text-sm text-slate-400">Customize your signal delivery rules</p>
                </div>
                <span className={`h-7 w-12 rounded-full ${i === 0 ? "bg-white/20" : "bg-emerald-500"}`} />
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_280px_70px] md:items-center">
      <div>
        <p className="font-black">{label}</p>
        <p className="text-sm text-slate-400">Set your minimum quality level</p>
      </div>
      <div className="h-2 rounded-full bg-white/10"><div className="h-2 w-3/4 rounded-full bg-yellow-400" /></div>
      <span className="rounded-lg border border-yellow-400/50 px-3 py-2 text-center font-black">{value}</span>
    </div>
  );
}
