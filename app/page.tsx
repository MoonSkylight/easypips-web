"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const SYMBOLS: Record<string, string> = {
  XAUUSD: "XAUUSD=X",
  OIL: "CL=F",
  SP500: "^GSPC",
  NASDAQ: "^IXIC",
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "JPY=X",
  USDCHF: "CHF=X",
  USDCAD: "CAD=X",
  AUDUSD: "AUDUSD=X",
  NZDUSD: "NZDUSD=X",
  EURJPY: "EURJPY=X",
  GBPJPY: "GBPJPY=X",
  EURGBP: "EURGBP=X",
  AUDJPY: "AUDJPY=X",
  EURAUD: "EURAUD=X",
};

type Signal = {
  id?: string;
  market?: string;
  timeframe?: string;
  decision?: string;
  signal_quality?: string;
  entry?: number | null;
  stop_loss?: number | null;
  tp1?: number | null;
  tp2?: number | null;
  tp3?: number | null;
  confidence?: number;
  risk?: string;
  rr_to_tp1?: number | null;
  spread_warning?: string;
  news_warning?: string;
  reasons?: string[];
  strategy_votes?: Record<string, [string, number]>;
  invalidation?: string;
  latest_price?: number | null;
  display_decision?: string;
  result?: string;
  order_type?: string;
  bias?: string;
  trigger_price?: number | null;
  published_at?: string;
  valid_until?: string;
  valid_for_minutes?: number;
  closed_price?: number | null;
  closed_at?: string;
  status?: string;
  source?: string;
};

type ManualDeskSignal = {
  id: string;
  desk: "DESK_1" | "DESK_2";
  trader_name: string;
  pair: string;
  side: "BUY" | "SELL";
  entry: number;
  stop_loss: number;
  take_profit: number;
  timeframe: string;
  note: string;
  status: "PUBLISHED";
  created_at: string;
  published_at: string;
};

type DashboardData = {
  latest_scan?: Record<string, Signal>;
  top_trade?: Signal | null;
  top_pending?: Signal | null;
  active?: Signal[];
  pending?: Signal[];
  closed?: Signal[];
  summary?: {
    active_count?: number;
    pending_count?: number;
    closed_count?: number;
    updated_at?: string;
    min_active_confidence?: number;
    min_pending_confidence?: number;
    mode?: string;
  };
  desk_signals?: ManualDeskSignal[];
};

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedMarket, setSelectedMarket] = useState("XAUUSD");
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [intervalValue, setIntervalValue] = useState("5");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(new Date());

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/pro-signals?interval=5m`, {
        cache: "no-store",
      });
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 12000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(timer);
      clearInterval(clock);
    };
  }, []);

  const active = data?.active || [];
  const pending = data?.pending || [];
  const closed = data?.closed || [];
  const latestScan = data?.latest_scan || {};
  const deskSignals = data?.desk_signals || [];
  const topTrade = data?.top_trade || null;
  const topPending = data?.top_pending || null;

  const selectedSignal = useMemo(() => {
    const all = [...active, ...pending];
    if (selectedSignalId) {
      const found = all.find((s) => s.id === selectedSignalId);
      if (found) return found;
    }

    return (
      all.find((s) => s.market === selectedMarket) ||
      latestScan[selectedMarket] ||
      topTrade ||
      topPending ||
      null
    );
  }, [active, pending, selectedSignalId, selectedMarket, latestScan, topTrade, topPending]);

  const chartSymbol = SYMBOLS[selectedMarket] || "XAUUSD=X";
  const tradingViewUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(
    chartSymbol
  )}&interval=${intervalValue}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0f172a&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1&locale=en`;

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-[1700px] px-4 py-4">
        <header className="mb-4 rounded-[28px] border border-white/10 bg-[#0b1627] px-5 py-4 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                EasyPips
              </p>
              <h1 className="mt-1 text-2xl font-bold">Live Signals Dashboard</h1>
              <p className="mt-2 text-sm text-slate-400">
                Updated at{" "}
                {data?.summary?.updated_at
                  ? new Date(data.summary.updated_at).toLocaleString()
                  : "—"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Chip>{loading ? "Loading..." : "Live"}</Chip>
              <Chip>{data?.summary?.mode || "BALANCED_PERFORMANCE"}</Chip>
              <Chip>Active {data?.summary?.active_count ?? 0}</Chip>
              <Chip>Pending {data?.summary?.pending_count ?? 0}</Chip>
              <Chip>Closed {data?.summary?.closed_count ?? 0}</Chip>
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <Panel title="Selected Signal" tint="yellow">
              {selectedSignal ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{selectedSignal.market || "—"}</Badge>
                    <Badge tone={getSideTone(selectedSignal)}>
                      {getSide(selectedSignal)}
                    </Badge>
                    <Badge>{selectedSignal.timeframe || "5m"}</Badge>
                    <Badge>
                      {selectedSignal.status ||
                        selectedSignal.signal_quality ||
                        "VIEW"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <Stat
                      label="Price"
                      value={fmt(selectedSignal.latest_price)}
                    />
                    <Stat
                      label="Entry"
                      value={fmt(
                        selectedSignal.entry ?? selectedSignal.trigger_price
                      )}
                    />
                    <Stat
                      label="SL"
                      value={fmt(selectedSignal.stop_loss)}
                      tone="red"
                    />
                    <Stat
                      label="TP1"
                      value={fmt(selectedSignal.tp1)}
                      tone="green"
                    />
                    <Stat
                      label="Confidence"
                      value={
                        selectedSignal.confidence != null
                          ? `${selectedSignal.confidence}%`
                          : "-"
                      }
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Reasoning
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {selectedSignal.reasons?.length
                        ? selectedSignal.reasons.join(" • ")
                        : "No explanation available for this signal."}
                    </p>
                  </div>
                </>
              ) : (
                <Empty text="No signal selected." />
              )}
            </Panel>

            <Panel title="TradingView Chart" tint="green">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {[
                  ["1m", "1"],
                  ["5m", "5"],
                  ["15m", "15"],
                  ["1h", "60"],
                  ["4h", "240"],
                  ["1D", "D"],
                ].map(([label, value]) => (
                  <button
                    key={value}
                    onClick={() => setIntervalValue(value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      intervalValue === value
                        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                        : "border-white/10 bg-white/5 text-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <Chip>{selectedMarket}</Chip>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#091425]">
                <iframe
                  key={`${selectedMarket}-${intervalValue}`}
                  src={tradingViewUrl}
                  className="h-[560px] w-full"
                  allowFullScreen
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-5">
                <Stat label="Market" value={selectedMarket} />
                <Stat label="Price" value={fmt(selectedSignal?.latest_price)} />
                <Stat
                  label="Entry"
                  value={fmt(
                    selectedSignal?.entry ?? selectedSignal?.trigger_price
                  )}
                />
                <Stat
                  label="SL"
                  value={fmt(selectedSignal?.stop_loss)}
                  tone="red"
                />
                <Stat
                  label="TP1"
                  value={fmt(selectedSignal?.tp1)}
                  tone="green"
                />
              </div>
            </Panel>

            <Panel title="Trading Zone" tint="purple">
              <div className="space-y-3">
                {[...active, ...pending].length ? (
                  [...active, ...pending].slice(0, 12).map((signal, index) => (
                    <button
                      key={signal.id || `${signal.market}-${index}`}
                      onClick={() => {
                        if (signal.market) setSelectedMarket(signal.market);
                        if (signal.id) setSelectedSignalId(signal.id);
                      }}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        selectedSignalId === signal.id
                          ? "border-fuchsia-300/35 bg-fuchsia-300/10"
                          : "border-white/10 bg-[#0f1c31] hover:border-fuchsia-300/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">
                            {signal.market || "-"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {signal.display_decision ||
                              signal.signal_quality ||
                              signal.decision ||
                              "WAIT"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">
                            {fmt(signal.latest_price)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {signal.timeframe || "5m"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <Empty text="No active or pending signals right now." />
                )}
              </div>
            </Panel>

            <Panel title="Closed Signals" tint="lightblue">
              <div className="space-y-2">
                {closed.length ? (
                  closed
                    .slice(0, 10)
                    .map((signal, i) => (
                      <ClosedRow key={signal.id || i} signal={signal} />
                    ))
                ) : (
                  <Empty text="No closed signals yet." />
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Desk 1 / Desk 2" tint="purple">
              <div className="space-y-4">
                <DeskCard
                  title="Desk 1"
                  trader="Doctor Rano"
                  note={
                    deskSignals.find((s) => s.desk === "DESK_1")?.note ||
                    "No manual signal yet."
                  }
                  signal={deskSignals.find((s) => s.desk === "DESK_1")}
                />
                <DeskCard
                  title="Desk 2"
                  trader="Doctor Fahdi"
                  note={
                    deskSignals.find((s) => s.desk === "DESK_2")?.note ||
                    "No manual signal yet."
                  }
                  signal={deskSignals.find((s) => s.desk === "DESK_2")}
                />
              </div>
            </Panel>

            <Panel title="Markets" tint="green">
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(SYMBOLS).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMarket(m)}
                    className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold ${
                      selectedMarket === m
                        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                        : "border-white/10 bg-[#0f1c31] text-white hover:border-white/20"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Quick Stats" tint="yellow">
              <div className="space-y-3">
                <InfoRow label="Top Trade" value={topTrade?.market || "None"} />
                <InfoRow
                  label="Top Pending"
                  value={topPending?.market || "None"}
                />
                <InfoRow label="Now" value={now.toLocaleTimeString()} />
                <InfoRow label="Backend" value={API_URL} />
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function getSide(signal?: Signal | null) {
  const raw = `${signal?.decision || ""} ${signal?.display_decision || ""} ${
    signal?.bias || ""
  }`.toUpperCase();
  if (raw.includes("BUY")) return "BUY";
  if (raw.includes("SELL")) return "SELL";
  return "WAIT";
}

function getSideTone(signal?: Signal | null) {
  const side = getSide(signal);
  if (side === "BUY") return "green";
  if (side === "SELL") return "red";
  return "muted";
}

function fmt(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number")
    return Number.isInteger(value) ? value.toString() : value.toFixed(5);
  return String(value);
}

function Panel({
  title,
  tint,
  children,
}: {
  title: string;
  tint: "yellow" | "green" | "purple" | "lightblue";
  children: React.ReactNode;
}) {
  const classes = {
    yellow:
      "border-yellow-400/20 bg-[linear-gradient(180deg,rgba(250,204,21,0.10),rgba(12,23,41,0.96))]",
    green:
      "border-emerald-400/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(12,23,41,0.96))]",
    purple:
      "border-fuchsia-400/20 bg-[linear-gradient(180deg,rgba(168,85,247,0.10),rgba(12,23,41,0.96))]",
    lightblue:
      "border-sky-300/20 bg-[linear-gradient(180deg,rgba(56,189,248,0.10),rgba(12,23,41,0.96))]",
  }[tint];

  return (
    <section className={`rounded-[28px] border p-4 shadow-2xl ${classes}`}>
      <p className="text-xs uppercase tracking-[0.26em] text-slate-400">
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "red" | "green";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 text-sm font-bold ${
          tone === "green"
            ? "text-green-400"
            : tone === "red"
            ? "text-red-400"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "green" | "red";
}) {
  const cls =
    tone === "green"
      ? "bg-green-400/15 text-green-300"
      : tone === "red"
      ? "bg-red-400/15 text-red-300"
      : "bg-slate-500/15 text-slate-300";

  return (
    <span className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase ${cls}`}>
      {children}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
      {children}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#091425] px-4 py-4 text-sm text-slate-400">
      {text}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ClosedRow({ signal }: { signal: Signal }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-white">{signal.market || "-"}</p>
          <p className="text-xs text-slate-400">
            {signal.result || "CLOSED"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-white">
            {fmt(signal.closed_price ?? signal.latest_price)}
          </p>
          <p className="text-xs text-slate-500">
            {signal.closed_at
              ? new Date(signal.closed_at).toLocaleString()
              : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function DeskCard({
  title,
  trader,
  note,
  signal,
}: {
  title: string;
  trader: string;
  note: string;
  signal?: ManualDeskSignal | undefined;
}) {
  if (!signal) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-[#0f1c31] p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
          {title}
        </p>
        <h3 className="mt-2 text-xl font-bold text-white">{trader}</h3>
        <p className="mt-2 text-sm text-slate-400">{note}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-fuchsia-300/20 bg-[#0f1c31] p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-200/75">
        {title}
      </p>
      <h3 className="mt-2 text-xl font-bold text-white">
        {signal.trader_name}
      </h3>
      <p className="mt-2 text-sm text-slate-300">
        {signal.pair} · {signal.side} · {signal.timeframe}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Stat label="Entry" value={fmt(signal.entry)} />
        <Stat label="SL" value={fmt(signal.stop_loss)} tone="red" />
        <Stat label="TP" value={fmt(signal.take_profit)} tone="green" />
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
        {signal.note || note}
      </div>
    </div>
  );
}