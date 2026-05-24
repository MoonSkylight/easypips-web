"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
function UTCClock() {
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    const update = () => {
      setTime(new Date().toISOString().slice(11, 19));
    };

    update();

    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden text-right text-xs md:block">
      <p className="text-slate-400">Server Time UTC</p>
      <p className="font-black">{time}</p>
    </div>
  );
}

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
  | "settings"
  | "help-center";

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
  name?: string;
  platform?: string;
  broker?: string;
  account_login?: string;
  status?: string;
  auto_trade_enabled?: boolean;
  license_code?: string;
};

const NAV = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { key: "live-signals", label: "Live Signals", href: "/live-signals", icon: "activity" },
  { key: "performance", label: "Performance", href: "/performance", icon: "chart" },
  { key: "strategies", label: "Strategies", href: "/strategies", icon: "strategy" },
  { key: "news-calendar", label: "News Calendar", href: "/news-calendar", icon: "calendar" },
  { key: "account", label: "Account (MT4/MT5)", href: "/account", icon: "account" },
  { key: "history", label: "History", href: "/history", icon: "history" },
  { key: "reports", label: "Reports", href: "/reports", icon: "reports" },
  { key: "settings", label: "Settings", href: "/settings", icon: "settings" },
  { key: "help-center", label: "Help Center", href: "/help-center", icon: "account" },
];

const PAIRS = [
  { pair: "XAU/USD", label: "Gold", cat: "Metals", icon: "ðŸŸ¡" },
  { pair: "EUR/USD", label: "Euro Dollar", cat: "Major", icon: "ðŸ‡ªðŸ‡º" },
  { pair: "GBP/USD", label: "Pound Dollar", cat: "Major", icon: "ðŸ‡¬ðŸ‡§" },
  { pair: "USD/JPY", label: "Dollar Yen", cat: "Major", icon: "ðŸ‡¯ðŸ‡µ" },
  { pair: "USD/CAD", label: "Dollar CAD", cat: "Major", icon: "ðŸ‡¨ðŸ‡¦" },
  { pair: "USD/CHF", label: "Dollar Swiss", cat: "Major", icon: "ðŸ‡¨ðŸ‡­" },
  { pair: "AUD/USD", label: "Aussie Dollar", cat: "Major", icon: "ðŸ‡¦ðŸ‡º" },
  { pair: "NZD/USD", label: "Kiwi Dollar", cat: "Major", icon: "ðŸ‡³ðŸ‡¿" },
  { pair: "BTC/USD", label: "Bitcoin", cat: "Crypto", icon: "â‚¿" },
  { pair: "ETH/USD", label: "Ethereum", cat: "Crypto", icon: "?†" },
  { pair: "EUR/GBP", label: "Euro Pound", cat: "Cross", icon: "ðŸ‡ªðŸ‡º" },
  { pair: "EUR/JPY", label: "Euro Yen", cat: "Cross", icon: "ðŸ‡¯ðŸ‡µ" },
  { pair: "GBP/JPY", label: "Pound Yen", cat: "Cross", icon: "ðŸ‡¬ðŸ‡§" },
  { pair: "AUD/JPY", label: "Aussie Yen", cat: "Cross", icon: "ðŸ‡¦ðŸ‡º" },
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


function NavIcon({
  name,
  active = false,
}: {
  name: string;
  active?: boolean;
}) {
  const cls = active ? "text-yellow-300" : "text-slate-400 group-hover:text-white";

  const common = {
    className: `h-5 w-5 shrink-0 ${cls}`,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "dashboard") {
    return (
      <svg {...common}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (name === "activity") {
    return (
      <svg {...common}>
        <path d="M4 12h3l2-6 4 12 2-6h5" />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 4-4 3 3 5-7" />
      </svg>
    );
  }

  if (name === "strategy") {
    return (
      <svg {...common}>
        <path d="M12 3v18" />
        <path d="M5 8h14" />
        <path d="M7 8l-3 5h6L7 8Z" />
        <path d="m17 8-3 5h6l-3-5Z" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M3 10h18" />
      </svg>
    );
  }

  if (name === "account") {
    return (
      <svg {...common}>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  if (name === "history") {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "reports") {
    return (
      <svg {...common}>
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 13h6" />
        <path d="M10 17h6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 0 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 0 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 0 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6.9h.1a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
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
    yellow: "border-yellow-300/40  text-yellow-300",
    red: "border-red-400/20 text-red-300",
    orange: "border-orange-400/20 text-orange-300",
  };

  return (
    <div className={`group rounded-2xl border ${colors[color]} bg-white/[0.045] p-3 shadow-xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.065]`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase">{title}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-sm opacity-90">
          {icon}
        </span>
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
    <section className="mb-4 overflow-hidden rounded-[2rem] border border-yellow-400/40 bg-gradient-to-r from-yellow-400/[0.13] via-white/[0.045] to-emerald-400/[0.08] p-[1px] shadow-xl shadow-yellow-500/10">
      <div className="flex flex-col gap-4 rounded-2xl bg-[#07101b]/90 px-5 py-4 backdrop-blur-xl lg:flex-row lg:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-lg shadow-yellow-400/15">
          <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 5 6v5c0 5 3.4 8.7 7 10 3.6-1.3 7-5 7-10V6l-7-3Z" />
            <path d="m9 12 2 2 4-5" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-black text-yellow-300">SYSTEM RULE</p>
          <p className="mt-1 text-sm leading-6 text-slate-200">
            EasyPips AI analyzes multiple market factors and only publishes signals after minimum confirmation is achieved.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <p className="text-6xl font-black leading-none text-yellow-300 drop-shadow-[0_0_30px_rgba(250,204,21,0.35)]">82%</p>
          <p className="pb-2 text-sm font-black uppercase tracking-widest text-slate-300">minimum<br />confirmation</p>
        </div>
      </div>
    </section>
  );
}

function isHighConfidenceLocked(s: Signal) {
  const confidence = Number(s.confidence || s.score || 0);
  return Number.isFinite(confidence) && confidence >= 85;
}

function LockedSignalCard({ s }: { s: Signal }) {
  const confidenceValue = Number(s.confidence || s.score || 0);
  const signalPrice = confidenceValue >= 90 ? "$5" : "$3";
  const unlockText = confidenceValue >= 90
    ? "Unlock $5"
    : "Unlock $3";

  const [loading, setLoading] = useState(false);

  async function unlockSignal() {
    try {
      setLoading(true);

      const res = await fetch("/api/create-single-signal-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signalId: s.id || s.symbol || "single-signal",
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      alert("Checkout could not start. Please try again.");
    } catch {
      alert("Checkout error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-yellow-300/40  bg-gradient-to-br transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300/50 hover:shadow-xl hover:shadow-yellow-400/15 from












-yellow-400/[0.10] via-white/[0.04] to-black/40 p-3 shadow-xl shadow-yellow-400/15">
      <div className="absolute right-4 top-4 rounded-full border border-yellow-300/40  bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-300">
        Premium
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-widest text-yellow-300">
          Premium AI Signal








        </p>

        <h3 className="mt-2 text-xl font-black text-white">
          {s.symbol}
        </h3>

 





       <p className="mt-1 text-xs font-black text-slate-500">
          Institutional AI setup hidden
        </p>
      </div>

      <div className="my-5 flex justify-center">
 





       <div className="flex h-16 w-16 items-center justify-center rounded-full border border-yellow-400/50 bg-yellow-400/10 text-2xl shadow-lg shadow-yellow-400/15">
          🔒
        </div>
      </div>





      <div className="rounded-2xl border border-white/8 bg-black/30 p-4 text-center backdrop-blur-md">
        <p className="text-sm font-black text-white">
          ••••••••••••••••
        </p>






        <p className="mt-1 text-xs text-slate-400">
          Unlock this signal instantly for {signalPrice}
 


       </p>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/8 bg-black/35 px-3 py-2 text-xs text-slate-300">
 



       <span>{s.strategy || "AI Strategy"}</span>
        <span>Live</span>
        <span>{confidenceValue}%</span>
      </div>





      <button
        onClick={unlockSignal}
        disabled={loading}
 



       className="mt-5 w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-500 px-5 py-3 text-center text-sm font-black text-black shadow-lg shadow-yellow-400/15 transition hover:scale-[1.02] disabled:opacity-60"
      >
        {loading ? "Opening Checkout..." : unlockText}
 


     </button>
    </div>
  );
}






function SignalCard({ s }: { s: Signal }) {
  const isSell = String(s.direction || "").toUpperCase().includes("SELL");
  return (
    <div className="group rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.065] to-white/[0.025] p-3 shadow-xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-1 hover:border-yellow-300/40 ">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">LIVE MARKET GENERATED</p>
          <h3 className="mt-1 text-xl font-black text-white">{s.symbol}</h3>
          <p className="text-xs text-slate-400">{formatDate(s.created_at)}</p>
          <p className="text-sm font-black text-yellow-300">confidence: {s.confidence || s.score || "-"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${isSell ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}`}>
          {s.direction}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-lg border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-black text-blue-300">
          "LIVE MARKET GENERATED"
        </span>
        <span className="text-xs font-black text-emerald-300">{s.status || "ACTIVE"}</span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
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
      <p className={`mt-1 max-w-full break-words text-sm font-black leading-tight ${good ? "text-emerald-300" : danger ? "text-red-300" : "text-white"}`}>{value || "-"}</p>
    </div>
  );
}

function Panel({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.045] p-3 shadow-xl shadow-black/30 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-white">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}


function LiveTradingChart() {
  const [pair, setPair] = useState("OANDA:XAUUSD");

  const pairs = [
    { label: "XAU/USD", value: "OANDA:XAUUSD" },
    { label: "EUR/USD", value: "OANDA:EURUSD" },
    { label: "GBP/USD", value: "OANDA:GBPUSD" },
    { label: "USD/JPY", value: "OANDA:USDJPY" },
    { label: "USD/CAD", value: "OANDA:USDCAD" },
    { label: "USD/CHF", value: "OANDA:USDCHF" },
    { label: "AUD/USD", value: "OANDA:AUDUSD" },
    { label: "NZD/USD", value: "OANDA:NZDUSD" },
    { label: "BTC/USD", value: "BITSTAMP:BTCUSD" },
    { label: "ETH/USD", value: "BITSTAMP:ETHUSD" },
    { label: "NAS100", value: "OANDA:NAS100USD" },
  ];

  const currentPair = pairs.find((p) => p.value === pair)?.label || "XAU/USD";

  return (
    <Panel
      title="Live Trading Chart"
      right={
        <div className="flex items-center gap-2">
          <Badge color="blue">Live</Badge>

          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="rounded-xl border border-white/8 bg-black/40 px-3 py-2 text-sm font-black text-yellow-300 outline-none"
          >
            {pairs.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/40">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div>
            <p className="text-sm font-black text-white">{currentPair} Live Chart</p>
            <p className="text-xs text-slate-400">TradingView market preview</p>
          </div>

          <div className="flex gap-2 text-xs font-black">
            <span className="rounded-lg bg-white/10 px-2 py-1 text-slate-300">
              15m
            </span>
            <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-emerald-300">
              ACTIVE
            </span>
          </div>
        </div>

        <div className="h-[430px] w-full bg-[#05070D]">
          <iframe
            key={pair}
            title="EasyPips Live TradingView Chart"
            src={`https://s.tradingview.com/widgetembed/?symbol=${pair}&interval=15&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=05070D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1`}
            className="h-full w-full"
            allowFullScreen
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Mini label="Chart" value="Live" good />
        <Mini label="Pair" value={currentPair} />
        <Mini label="Timeframe" value="15m" />
      </div>
    </Panel>
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

      <div className="overflow-hidden rounded-2xl border border-white/8">
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
function cleanSymbol(symbol?: string) {
  return String(symbol || "").replace("/", "").toUpperCase();
}

function getLivePrice(symbol: string | undefined, livePrices: Record<string, any>) {
  const clean = cleanSymbol(symbol);
  const candidates = [
    symbol,
    clean,
    clean.replace("XAUUSD", "XAU/USD"),
    clean.replace("GBPUSD", "GBP/USD"),
    clean.replace("EURUSD", "EUR/USD"),
    clean.replace("USDJPY", "USD/JPY"),
  ].filter(Boolean) as string[];

  for (const key of candidates) {
    const v = livePrices[key];
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }

  return null;
}

function pipSize(symbol?: string) {
function displayPips(s: Signal, livePrices: Record<string, any>) {
  const entry = Number(s.entry);

  if (!Number.isFinite(entry)) return null;

  if (s.hit_tp3 && s.tp3) {
    return Math.round(Math.abs(Number(s.tp3) - entry) / pipSize(s.symbol));
  }

  if (s.hit_tp2 && s.tp2) {
    return Math.round(Math.abs(Number(s.tp2) - entry) / pipSize(s.symbol));
  }

  if (s.hit_tp1 && s.tp1) {
    return Math.round(Math.abs(Number(s.tp1) - entry) / pipSize(s.symbol));
  }

  return null;
}

function tickerStatus(s: Signal, livePrices: Record<string, any>) {
  const pips = displayPips(s, livePrices);

  if (s.hit_tp3) {
    return {
      text: `TP3 HIT +${pips} PIPS`,
      color: "text-emerald-300",
    };
  }

  if (s.hit_tp2) {
    return {
      text: `TP2 HIT +${pips} PIPS`,
      color: "text-emerald-300",
    };
  }

  if (s.hit_tp1) {
    return {
      text: `TP1 HIT +${pips} PIPS`,
      color: "text-emerald-300",
    };
  }

  return {
    text: "ACTIVE",
    color: "text-yellow-300 ",
  };
}
  const s = cleanSymbol(symbol);
  if (s.includes("JPY")) return 0.01;
  if (s.includes("XAU")) return 0.1;
  if (s.includes("BTC") || s.includes("ETH")) return 1;
  return 0.0001;
}

function runningPips(s: Signal, livePrices: Record<string, any>) {
  const live = getLivePrice(s.symbol, livePrices);
  const entry = Number(s.entry);

  if (!Number.isFinite(entry) || live === null) return null;

  const isSell = String(s.direction || "").toUpperCase().includes("SELL");
  const diff = isSell ? entry - live : live - entry;

  return Math.round(diff / pipSize(s.symbol));
}

function tpText(s: Signal) {
  if (s.hit_tp3) return "TP3 HIT";
  if (s.hit_tp2) return "TP2 HIT";
  if (s.hit_tp1) return "TP1 HIT";
  return "RUNNING";
}
function tickerStatus(s: Signal, livePrices: Record<string, any>) {
  const entry = Number(s.entry);

  function fixedPips(target: any) {
    const targetPrice = Number(target);
    if (!Number.isFinite(entry) || !Number.isFinite(targetPrice)) return null;
    return Math.round(Math.abs(targetPrice - entry) / pipSize(s.symbol));
  }

  if (s.hit_tp3) {
    const pips = fixedPips(s.tp3);
    return { text: `TP3 HIT +${pips ?? 0} PIPS`, color: "text-emerald-300" };
  }

  if (s.hit_tp2) {
    const pips = fixedPips(s.tp2);
    return { text: `TP2 HIT +${pips ?? 0} PIPS`, color: "text-emerald-300" };
  }

  if (s.hit_tp1) {
    const pips = fixedPips(s.tp1);
    return { text: `TP1 HIT +${pips ?? 0} PIPS`, color: "text-emerald-300" };
  }

  return { text: "ACTIVE", color: "text-yellow-300 " };
}

export default function EasyPipsShell({ page }: { page: PageKey }) {
  const pathname = usePathname();
  const isClientDashboard = pathname?.startsWith("/client/dashboard");
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [closed, setClosed] = useState<Signal[]>([]);
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState("All");
  const [selectedPairs, setSelectedPairs] = useState<string[]>(["XAU/USD", "EUR/USD", "GBP/USD"]);
  const [pairSearch, setPairSearch] = useState("");
  const [cat, setCat] = useState("Major");
  const [isPremium, setIsPremium] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
const clientToken =
  typeof window !== "undefined"
    ? localStorage.getItem("easypips_client_token")
    : null;

  
  async function loadData() {
    try {
      const [signalsRes, closedRes, newsRes, accountRes, priceRes] = await Promise.allSettled([
        fetch(`${API}/all-paid-signals`),
        fetch(`${API}/closed-signals`),
        fetch(`${API}/news-calendar`),
        fetch(`${API}/client-accounts`),fetch(`${API}/live-prices`),
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
if (priceRes.status === "fulfilled") {
  const data = await priceRes.value.json();
  setLivePrices(data || {});
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
      setIsPremium(localStorage.getItem("easypips-premium-access") === "true");
    } catch {
      setIsPremium(false);
    }
  }, []);

  function enablePremiumPreview() {
    try {
      localStorage.setItem("easypips-premium-access", "true");
      setIsPremium(true);
    } catch {
      setIsPremium(true);
    }
  }

  function disablePremiumPreview() {
    try {
      localStorage.removeItem("easypips-premium-access");
      setIsPremium(false);
    } catch {
      setIsPremium(false);
    }
  }

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
      setSettingsMessage("Preferences saved ✓");
      setTimeout(() => setSettingsMessage(""), 2500);
    } catch {
      setSettingsMessage("Unable to save preferences");
    }
  }

 const live = allSignals.filter(
  (s) => (s.status || "ACTIVE") === "ACTIVE"
);

const utcHour = new Date().getUTCHours();

const utcMinute = new Date().getUTCMinutes();

const isLondon =
  utcHour >= 7 && utcHour <= 16;

const isNewYork =
  utcHour >= 12 && utcHour <= 21;

const newsProtection =
  utcMinute >= 25 && utcMinute <= 35;

const sessionAllowed =
  (isLondon || isNewYork) &&
  !newsProtection;

const strategyQualityScore =
  sessionAllowed && !newsProtection
    ? "A"
    : "C";

const strategyQualityLabel =
  strategyQualityScore === "A"
    ? "High Quality Market"
    : "Monitoring Market";

const londonLabel = isLondon
  ? "{londonLabel}"
  : "London ○ CLOSED";

const newYorkLabel = isNewYork
  ? "{newYorkLabel}"
  : "New York ○ CLOSED";
const visibleLiveRaw = sessionAllowed
  ? live.filter((s) => {
      // Do not hide platform signals from the main dashboard.
      // User pair preferences are saved in Settings, but filtering should only be applied
      // later when we build account-based personalization.

      if (filter === "All") return true;

      if (filter === "Trading Room") {
        return (
          s.desk === "Desk 1" ||
          s.desk === "Help Desk" ||
          s.desk === "Trading Room"
        );
      }

      return s.strategy === filter;
    })
  : live.slice(0, 6);

  const visibleLive = visibleLiveRaw;

  const totalSignals = allSignals.length + closed.length;
const activeCount = live.length;
const closedCount = closed.length;

const wins = closed.filter((s) => String(s.result || "").includes("WIN")).length;

const losses = closed.filter((s) => String(s.result || "").includes("LOSS")).length;

const dashboardWinRate =
  closedCount > 0
    ? ((wins / closedCount) * 100).toFixed(1)
    : "0.0";

const tpHits = allSignals.filter((s) => s.hit_tp1 || s.hit_tp2 || s.hit_tp3).length + closed.filter((s) => String(s.result || "").includes("TP")).length;

const helpDesk = allSignals.filter((s) => s.desk === "Desk 1" || s.desk === "Trading Room").length;

const slHits = allSignals.filter((s) => s.hit_sl).length + closed.filter((s) => String(s.result || "").includes("SL")).length;

  const stats = (
    <div className="mb-3 grid grid-cols-3 gap-2 xl:grid-cols-6">
      <StatCard title="Total Signals" value={totalSignals} color="cyan" icon="TS" />
      <StatCard title="Active Signals" value={activeCount} color="green" icon="AS" />
      <StatCard title="Closed Trades" value={closedCount} color="purple" icon="CT" />
      <StatCard title="TP Hits" value={tpHits} color="green" icon="TP" />
      <StatCard title="SL Hits" value={slHits} color="red" icon="SL" />
      <StatCard title="Trading Room" value={helpDesk} color="green" icon="TR" />
    </div>
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#030811] text-white">
<style jsx global>{`
  @keyframes ticker {
  0% {
    transform: translate3d(100%, 0, 0);
  }

  100% {
    transform: translate3d(-100%, 0, 0);
  }
}
`}</style>
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-[-160px] top-[-160px] h-[420px] w-[420px] rounded-full bg-yellow-400/10 blur-[120px]" />
        <div className="absolute right-[-180px] top-[120px] h-[420px] w-[520px] rounded-full bg-emerald-400/10 blur-[140px]" />
        <div className="absolute bottom-[-220px] left-[35%] h-[420px] w-[520px] rounded-full bg-cyan-400/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_35%)]" />
      </div>

      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-[240px] border-r border-white/8 bg-[#07101b]/90 p-4 shadow-xl backdrop-blur-xl xl:block">
        <Link href="/dashboard" className="mb-5 flex items-center gap-4 px-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-emerald-300 font-black text-black shadow-lg shadow-yellow-400/15">EP</div>
          <div>
            <h1 className="text-xl font-black">
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
                className={`group flex h-12 items-center gap-3 rounded-2xl px-4 py-3 font-black tracking-tight ${
                  active ? "border border-yellow-400/40 bg-yellow-400/15 text-yellow-300 shadow-lg shadow-yellow-500/5" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                  <NavIcon name={item.icon} active={active} />
                </span>
                <span className="truncate">{item.label}</span>
                {item.key === "history" && <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">NEW</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-2xl border border-yellow-400/40 bg-yellow-400/[0.03] p-3">
          <h3 className="text-xl font-black text-yellow-300">Premium AI Signals</h3>
          <div className="mt-4 space-y-3 text-sm">
            <p>✓ AI powered strategies</p>
            <p>✓ Desk 1 and Trading Room</p>
            <p>✓ News calendar</p>
            <p>✓ MT4 / MT5 ready</p>
          </div>
          <a href="https://t.me/" target="_blank" className="mt-5 block rounded-xl bg-yellow-400 px-4 py-2 text-center font-black text-black">
            Join Telegram
          </a>
        </div>

        <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.04] p-3">
          <p className="text-slate-400">Market Status</p>
          <p className="mt-2 font-black text-emerald-300">OPEN</p>
          <div className="mt-4 h-4 rounded-full bg-emerald-500/20">
            <div className="h-4 w-3/4 rounded-full bg-emerald-400" />
          </div>
          <p className="mt-6 text-slate-400">System Status</p>
          <p className="mt-2 font-black text-emerald-300">RUNNING ?</p>
        </div>
      </aside>

      <section className="relative z-10 xl:pl-[240px]">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-[#030811]/90 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5">
              <div className="mr-4 flex shrink-0 items-center gap-2">
  <span className="h-2 w-2 rounded-full bg-emerald-400" />

  <div className="flex items-center gap-3">
    <span className="text-xs font-black uppercase tracking-widest text-emerald-300">
      LIVE MARKET STATUS
    </span>

    <div className="ml-2 hidden items-center gap-2 xl:flex">
      <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
        London ● OPEN
      </span>

      <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
        New York ● OPEN
      </span>

      <span className="rounded-full bg-slate-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
        Asia ○ Closed
      </span>
    </div>
  </div>
</div>
              <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
  <div className="animate-[ticker_60s_linear_infinite] will-change-transform text-xs font-black text-white">
    {visibleLive.slice(0, 8).map((s, i) => {
      const status = tickerStatus(s, livePrices);

      return (
        <span key={s.id || i} className="mr-10">
          <span className="font-black text-white">
            {s.symbol}
          </span>{" "}

          <span className={status.color}>
            {status.text}
          </span>
        </span>
      );
    })}
  </div>
</div>
</div>

<div className="flex items-center gap-4">
              <div className="hidden text-right text-xs md:block">
                <p className="text-slate-400">Server Time UTC</p>
                <UTCClock />
              </div>{clientToken ? (
  <>
    <button
      type="button"
      onClick={() => {
        localStorage.removeItem("easypips_client_token");
        window.location.href = "/client/login";
      }}
      className="rounded-2xl bg-red-500 px-5 py-3 font-black text-white hover:bg-red-400"
    >
      Logout
    </button>

    <a href="https://t.me/" target="_blank" className="rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-5 py-3 font-black text-black shadow-lg shadow-yellow-400/15 hover:from-yellow-200 hover:to-yellow-300">
      Join Telegram
    </a>
  </>
) : (
  <>
    <Link
      href="/client/signup"
      className="rounded-xl bg-yellow-400 px-4 py-2 font-black text-black hover:bg-yellow-300"
    >
      Sign Up
    </Link>

    <Link
 
     href="/client/login"
      className="rounded-2xl border border-white/8 px-5 py-3 font-black text-white hov
er:bg-white/10"
    >
      Login
    </Link>

    <a href="https://t.me/" target="_blank" className="rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-5 py-3 font-black text-black shadow-lg shadow-yellow-400/15 hover:from-yellow-200 hover:to-yellow-300">
      Join Telegram
    </a>


  </>
)}
            </div>
          </div>
        </header>

        <div className="xl:hidden px-4 pt-4">
          {/* Mobile navigation */}
          <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.04] p-2">
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

        <div className="mx-auto max-w-[1600px] p-3">
          <SystemRule />
{page === "dashboard" && (
  <>

    <div className="mb-2 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-widest">
      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">
        Volatility: Normal
      </span>

      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-300">
        Liquidity: High
      </span>

      <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-yellow-300">
        Spreads: Stable
      </span>

      <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-red-300">
        News Risk: Low
      </span>
    </div>
  </>
)}
<span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-300">
  Strategy Quality: {strategyQualityScore} — {strategyQualityLabel}
</span>

 <span className={`rounded-full border px-3 py-1 ${
  newsProtection
    ? "border-red-400/20 bg-red-400/10 text-red-300"
    : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
}`}>
  News Protection: {newsProtection ? "ACTIVE" : "CLEAR"}
</span>         
          {page !== "settings" && stats}

          {page === "dashboard" && (
  <div className="space-y-4">
    <LiveSignalsPanel
      signals={visibleLive}
      filter={filter}
      setFilter={setFilter}
      isPremium={isPremium}
     
    />

    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <LiveTradingChart />

      <div className="grid gap-4">
        <Panel title="Trading Room">
          <div className="space-y-3 text-sm">
            <p className="text-emerald-300 font-black">Live</p>
            <p className="text-slate-300">High probability setups in progress.</p>
            <button className="mt-3 w-full rounded-xl border border-yellow-400/40 px-3 py-2 text-xs font-black text-yellow-300">
              Go to Trading Room
            </button>
          </div>
        </Panel>

        <Panel title="AI Market Scan">
          <div className="space-y-3 text-sm">
            <p className="text-slate-400">Markets monitored</p>
            <p className="text-xl font-black text-white">28</p>
            <p className="text-slate-300">Details hidden for premium users.</p>
          </div>
        </Panel>

        <Panel title="Market Sessions">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>London</span><span className="text-emerald-300">OPEN</span></div>
            <div className="flex justify-between"><span>New York</span><span className="text-emerald-300">OPEN</span></div>
            <div className="flex justify-between"><span>Asia</span><span className="text-slate-400">CLOSED</span></div>
          </div>
        </Panel>
      </div>
    </div>

    <div className="border-t border-white/10 pt-4 text-center text-xs text-slate-500">
      Disclaimer <span className="mx-2">•</span> Terms <span className="mx-2">•</span> Privacy <span className="mx-2">•</span> Refund Policy
    </div>
  </div>
)}

          {page === "live-signals" && (
            <div className="space-y-4">
              <LiveSignalsPanel signals={visibleLive} filter={filter} setFilter={setFilter} isPremium={isPremium} />
              {!isPremium && (
                <PremiumLock
                  title="Full Live Signals Locked"
                  message="Free users can preview a few Strategy A signals. Premium unlocks all real-time signals, Strategy B, Strategy C, Trading Room signals, and Telegram delivery."
                />
              )}
            </div>
          )}

          {page === "performance" && <PerformancePage closed={closed} allSignals={allSignals} />}
          {page === "strategies" && <StrategiesPage allSignals={allSignals} />}
          {page === "news-calendar" && <NewsCalendarPage events={news} />}
          {page === "account" && <AccountPage accounts={accounts} />}

          {page === "history" &&
            (isPremium ? (
              <HistoryPage closed={closed} />
            ) : (
              <PremiumLock
                title="History is Premium"
                message="Upgrade to Premium to unlock closed trades, TP/SL history, result tracking, dates, strategy outcomes, and export-ready trade records."
              />
            ))}

          {page === "reports" &&
            (isPremium ? (
              <ReportsPage closed={closed} allSignals={allSignals} />
            ) : (
              <PremiumLock
                title="Reports are Premium"
                message="Upgrade to Premium to unlock performance reports, downloadable summaries, strategy analytics, and trading result breakdowns."
              />
            ))}
          {page === "help-center" && <HelpCenterPage />}

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
    
<div className="mt-10 border-t border-white/8 pt-6 text-center text-sm text-slate-400">
  <div className="flex flex-wrap items-center justify-center gap-4">
    <a href="/legal/disclaimer" className="hover:text-white">Disclaimer</a>
    <a href="/legal/terms" className="hover:text-white">Terms</a>
    <a href="/legal/privacy" className="hover:text-white">Privacy</a>
    <a href="/legal/refund-policy" className="hover:text-white">Refund Policy</a>
  </div>

  <p className="mt-4 text-xs text-slate-500">
    Educational purposes only. Not financial advice. Trading involves risk.
  </p>
</div>

</main>
  );
}


function PremiumLock({
  title,
  message,
  cta = "Upgrade to Premium",
}: {
  title: string;
  message: string;
  cta?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-yellow-300/40  bg-gradient-to-br from-yellow-400/[0.12] via-white/[0.045] to-emerald-400/[0.08] p-[1px] shadow-xl shadow-yellow-500/10">
      <div className="rounded-[2rem] bg-[#07101b]/95 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-lg shadow-yellow-400/15">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>

        <h3 className="mt-5 text-xl font-black text-white">{title}</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">{message}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/client/signup"
            className="rounded-2xl bg-yellow-400 px-6 py-3 font-black text-black hover:bg-yellow-300"
          >
            {cta}
          </Link>

          <Link
            href="/dashboard"
            className="rounded-2xl border border-white/8 px-6 py-3 font-black text-white hover:bg-white/10"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function PremiumBanner() {
  return null;
}
function LiveSignalsPanel({
  signals,
  filter,
  setFilter,
compact,
isPremium,
}: {
  signals: Signal[];
  filter: string;
  setFilter: (x: string) => void;
 compact?: boolean;
  isPremium: boolean;
}) {
  const filters = ["All", "Strategy A", "Strategy B", "Strategy C", "Strategy D", "Trading Room"];

  return (
    <Panel title={`Live Signals (${signals.length})`}>
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-2 text-xs font-black ${
              filter === f ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/15" : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {signals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/8 bg-black/30 p-10 text-center text-slate-400">No active signals for this filter yet.</div>
      ) : (
        <div className={`grid max-h-[500px] gap-3 overflow-y-auto pr-2 ${compact ? "lg:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
          {signals.map((s, i) =>
            !isPremium && isHighConfidenceLocked(s) ? (
              <LockedSignalCard key={s.id || i} s={s} />
            ) : (
              <SignalCard key={s.id || i} s={s} />
            )
          )}
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
        <div className="flex h-32 w-32 items-center justify-center rounded-full border-[16px] border-emerald-400/80 text-xl font-black">{rate}%</div>
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
              <span>{s.symbol} Â· {s.direction}</span>
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

  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/real-analytics`)
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, []);

  const wins = closed.filter((s) => String(s.result || "").toUpperCase().includes("TP") || String(s.result || "").toUpperCase().includes("WIN")).length;

  const losses = closed.filter((s) => String(s.result || "").toUpperCase().includes("SL") || String(s.result || "").toUpperCase().includes("LOSS")).length;
const strategyStats = ["Strategy A", "Strategy B", "Strategy C", "Strategy D"]
  .map((strategy) => {
    const strategyTrades = closed.filter((s) => s.strategy === strategy);

    const total = strategyTrades.length;

    const wins = strategyTrades.filter((s) =>
      String(s.result || "").toUpperCase().includes("WIN") ||
      String(s.result || "").toUpperCase().includes("TP")
    ).length;

    const rate =
      total > 0
        ? Math.round((wins / total) * 100)
        : 0;

    let status = "Monitor";

    if (rate >= 70) status = "Strong";
    else if (rate >= 55) status = "Healthy";
    else if (rate < 40) status = "Weak";

    return {
      strategy,
      total,
      wins,
      rate,
      status,
    };
  });

const disabledStrategies = strategyStats
  .filter((x) => x.status === "Weak" && x.total >= 5)
  .map((x) => x.strategy);
const dashboardWinRate = closed.length > 0 ? ((wins / closed.length) * 100).toFixed(1) : "0.0";
  const rate = closed.length ? Math.round((wins / closed.length) * 100) : 0;
const tradeResults = closed.map((s) => {
  const result = String(s.result || "").toUpperCase();

  if (result.includes("TP")) return 1;
  if (result.includes("WIN")) return 1;
  if (result.includes("SL")) return -1;
  if (result.includes("LOSS")) return -1;

  return 0;
});

let runningEquity = 0;
let peakEquity = 0;
let worstDrawdown = 0;
let currentWinStreak = 0;
let currentLossStreak = 0;
let bestWinStreak = 0;

const equityCurve = tradeResults.map((r) => {
  runningEquity += r;
  peakEquity = Math.max(peakEquity, runningEquity);

  const drawdown = runningEquity - peakEquity;
  worstDrawdown = Math.min(worstDrawdown, drawdown);

  if (r > 0) {
    currentWinStreak += 1;
    currentLossStreak = 0;
    bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
  }

  if (r < 0) {
    currentLossStreak += 1;
    currentWinStreak = 0;
  }

  return runningEquity;
});

const maxDrawdown =
  equityCurve.length > 0 ? `${worstDrawdown}` : "0";

const bestStreak =
  equityCurve.length > 0 ? `${bestWinStreak}` : "0";

const currentStreak =
  currentWinStreak > 0
    ? `W${currentWinStreak}`
    : currentLossStreak > 0
      ? `L${currentLossStreak}`
      : "0";

const monthlyReturn =
  equityCurve.length > 0 ? `${runningEquity > 0 ? "+" : ""}${runningEquity}R` : "0R";

  return (
    <div className="space-y-4">
      {analytics && (
        <Panel title="Real Backend Analytics">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard title="Closed Trades" value={analytics.totalClosed || 0} color="cyan" />
            <StatCard title="Wins" value={analytics.wins || 0} color="green" />
            <StatCard title="Losses" value={analytics.losses || 0} color="red" />
            <StatCard title="Real Win Rate" value={`${analytics.winRate || 0}%`} color="yellow" />
          </div>
        </Panel>
      )}
      <Panel title="Performance Overview" right={<button className="rounded-xl border border-white/8 px-4 py-2">Export CSV</button>}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard title="Total Trades" value={closed.length} color="cyan" />
          <StatCard title="Winning Trades" value={wins} color="green" />
          <StatCard title="Losing Trades" value={losses} color="red" />
          <StatCard title="Win Rate" value={`${rate}%`} color="yellow" />
          <StatCard title="Total Pips" value="Real data only" color="green" />
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Cumulative Pips"><p className="text-slate-400">Real pip analytics will appear after closed trades are recorded with pip results.</p></Panel>
        <FakeChart title="Win Rate Over Time" value={`${rate}%`} />
        <Panel title="Monthly Pips Comparison"><p className="text-slate-400">Monthly comparison will appear after enough real closed trade data is available.</p></Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <TablePanel title="Performance by Pair" rows={["EUR/USD", "BTC/USD", "XAU/USD", "GBP/USD", "USD/JPY"]} />
        <TablePanel title="Performance by Strategy" rows={["Strategy A", "Strategy B", "Strategy C", "Trading Room"]} />
        <Panel title="Summary">
          <div className="space-y-3 text-sm">
            <Row label="Total Trades" value={closed.length} />
            <Row label="Winning Trades" value={wins} />
            <Row label="Losing Trades" value={losses} />
            <Row label="Win Rate" value={`${rate}%`} />
            <Row label="Average RR" value="Real data only" />
            <Row label="Profit Factor" value="Real data only" />
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
      <div className="mt-5 flex h-48 items-end gap-2 border-b border-l border-white/8 p-3">
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
    { title: "Strategy D", sub: "Institutional Liquidity Scalper", color: "cyan" },
    { title: "Trading Room", sub: "Manual support desk signals", color: "yellow" },
  ];
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {cards.map((c) => {
        const count = allSignals.filter((s) => s.strategy === c.title || s.desk === c.title).length;
        return (
          <Panel key={c.title} title={c.title}>
            <p className="text-slate-400">{c.sub}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Mini label="Active" value={count} />
              <Mini label="TP" value={0} good />
              <Mini label="SL" value={0} danger />
            </div>
            <div className="mt-5 rounded-2xl bg-black/30 p-3">
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
  const myAccount = null;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="MT5 Connection Request">
        <form
  className="grid gap-3"
  onSubmit={async (e) => {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    const res = await fetch(`${API}/client-accounts/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: fd.get("name"),
        platform: fd.get("platform"),
        broker: fd.get("broker"),
        account_login: fd.get("account_login"),
        risk_mode: "copy",
        max_lot: 0.01,
        consent: true,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message || "Request failed");
      return;
    }

    alert("Connection request submitted");
    window.location.reload();
  }}
>
  <input
    name="name"
    placeholder="Full Name"
    className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3 outline-none"
  />

  <input
    name="email"
    placeholder="Email"
    className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3 outline-none"
  />

  <input
    name="account_login"
    placeholder="MT5 Login"
    className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3 outline-none"
  />

  <input
    name="broker"
    placeholder="Broker Server"
    className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3 outline-none"
  />

  <select
    name="platform"
    defaultValue="MT5"
    className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3 outline-none"
  >
    <option>MT5</option>
    <option>MT4</option>
  </select>

  <textarea
    name="note"
    placeholder="Risk note / request details"
    className="min-h-28 rounded-2xl border border-white/8 bg-black/30 px-4 py-3 outline-none"
  />

    <button
    type="submit"
    className="rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-400 px-5 py-3 font-black text-black shadow-lg shadow-yellow-400/15 hover:from-yellow-200 hover:to-yellow-300"
  >
    Submit Connection Request
  </button>
</form>
</Panel>

<Panel title="My EA Access">
  <p className="text-slate-400">
    Your MT4 / MT5 license and EA download will appear here after your account is linked and approved.
  </p>

  <a
    href="/downloads/EasyPipsCopier.ex5"
    download
    className="mt-4 inline-block rounded-xl bg-yellow-400 px-4 py-2 font-black text-black"
  >
    Download EA
  </a>
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
    <Panel title="History (Closed Trades)" right={<button className="rounded-xl border border-white/8 px-4 py-2">Export CSV</button>}>
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
                <td className="p-3 text-emerald-300">
  {r.result === "TP3"
    ? "3.0R"
    : r.result === "TP2"
    ? "2.0R"
    : r.result === "TP1"
    ? "1.0R"
    : r.result === "SL"
    ? "-1.0R"
    : "Pending"}
</td>
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
    <div className="space-y-4">
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
      <div className="mb-5 flex flex-wrap gap-4 border-b border-white/8 pb-3 text-sm font-black">
        {["General", "Notifications", "Signal Preferences", "Risk Management", "Account Connections", "Security", "API Settings"].map((t) => (
          <button key={t} className={t === "Signal Preferences" ? "text-yellow-300" : "text-white"}>{t}</button>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <Panel title="Signal Preferences">
          <p className="mb-5 text-slate-400">Choose specific instruments. Example: select only XAU/USD Gold or EUR/USD.</p>

          <input
            value={pairSearch}
            onChange={(e) => setPairSearch(e.target.value)}
            placeholder="Search for a pair or instrument..."
            className="mb-4 w-full rounded-2xl border border-white/8 bg-black/30 px-4 py-3 outline-none"
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

          <div className="max-h-[430px] overflow-y-auto rounded-2xl border border-white/8">
            <div className="grid grid-cols-[50px_80px_1fr_100px_110px] bg-black/40 px-3 py-3 text-xs font-black text-slate-500">
              <span>Pair</span><span></span><span>Instrument</span><span>Category</span><span>Status</span>
            </div>
            {pairs.map((p) => {
              const selected = selectedPairs.includes(p.pair);
              return (
                <button key={p.pair} onClick={() => toggle(p.pair)} className="grid w-full grid-cols-[50px_80px_1fr_100px_110px] border-t border-white/5 px-3 py-3 text-left text-sm hover:bg-white/5">
                  <span className={`h-5 w-5 rounded border ${selected ? "border-emerald-400 bg-emerald-400 text-black" : "border-slate-600"}`}>{selected ? "?" : ""}</span>
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
              className="rounded-xl bg-yellow-400 px-4 py-2 font-black text-black hover:bg-yellow-300"
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

        <div className="space-y-4">
          <Panel title="Signal Types">
            <div className="grid gap-3 md:grid-cols-2">
              {["Buy Signals", "Sell Signals", "Breakout Signals", "Reversal Signals"].map((x) => (
                <div key={x} className="rounded-2xl border border-white/8 bg-black/35 p-4">
                  <p className="font-black text-white">✓ {x}</p>
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


function HelpCenterPage() {
  return (
    <div className="space-y-4">
      <Panel title="Help Center">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.06] p-6">
            <h3 className="text-xl font-black text-yellow-300">Premium Support</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Contact admin for billing, premium access, Telegram access, or MT4/MT5 connection help.
            </p>
            <a href="https://t.me/" target="_blank" className="mt-5 block rounded-xl bg-yellow-400 px-4 py-2 text-center font-black text-black">
              Contact Support
            </a>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-6">
            <h3 className="text-xl font-black text-emerald-300">MT4 / MT5 Help</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Need help connecting your trading account? Submit a request from the Account page.
            </p>
            <Link href="/account" className="mt-5 block rounded-2xl border border-white/8 px-5 py-3 text-center font-black hover:bg-white/10">
              Open Account Page
            </Link>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-6">
            <h3 className="text-xl font-black text-cyan-300">FAQ Coming Soon</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              We will add repeated questions, trading rules, billing help, and onboarding support here.
            </p>
            <Link
  href="/client/login"
  className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
>
  Login
</Link>

<Link
  href="/client/signup"
  className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-black text-black hover:bg-yellow-300"
>
  Sign Up
</Link>
<Link href="/client/signup" className="mt-5 block rounded-2xl border border-white/8 px-5 py-3 text-center font-black hover:bg-white/10">
              View Pricing
            </Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}

















































































































