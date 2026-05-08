"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-engine.onrender.com";

const PAIRS: Record<string, string> = {
  XAUUSD: "OANDA:XAUUSD",
  EURUSD: "OANDA:EURUSD",
  GBPUSD: "OANDA:GBPUSD",
  USDJPY: "OANDA:USDJPY",
  USDCHF: "OANDA:USDCHF",
  USDCAD: "OANDA:USDCAD",
  AUDUSD: "OANDA:AUDUSD",
  NZDUSD: "OANDA:NZDUSD",
  EURJPY: "OANDA:EURJPY",
  GBPJPY: "OANDA:GBPJPY",
  EURGBP: "OANDA:EURGBP",
  AUDJPY: "OANDA:AUDJPY",
  EURAUD: "OANDA:EURAUD",
  NASDAQ: "NASDAQ:IXIC",
  SP500: "SP:SPX",
  OIL: "TVC:USOIL",
};

type SignalLike = {
  id?: string;
  market?: string;
  timeframe?: string;
  status?: string;
  display_decision?: string;
  decision?: string;
  signal_quality?: string;
  order_type?: string;
  bias?: string;
  entry?: number;
  trigger_price?: number;
  latest_price?: number;
  stop_loss?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  confidence?: number;
  risk?: string;
  published_at?: string;
  valid_until?: string;
  valid_for_minutes?: number;
  reasons?: string[];
  result?: string;
  invalidation?: string;
  closed_price?: number;
};

type DashboardData = {
  latest_scan?: Record<string, SignalLike>;
  top_trade?: SignalLike | null;
  top_pending?: SignalLike | null;
  active?: SignalLike[];
  pending?: SignalLike[];
  closed?: SignalLike[];
  summary?: {
    active_count?: number;
    pending_count?: number;
    closed_count?: number;
    updated_at?: string;
    min_active_confidence?: number;
    min_pending_confidence?: number;
    mode?: string;
  };
};

type DeskSignal = {
  title: string;
  trader: string;
  about: string;
  side: "LONG" | "SHORT";
  pair: string;
  entry?: number;
  stopLoss?: number;
  target?: number;
  time: string;
  note: string;
};

const TIMEFRAMES = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "1h", value: "60" },
  { label: "4h", value: "240" },
  { label: "1D", value: "D" },
];

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedPair, setSelectedPair] = useState("XAUUSD");
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tvInterval, setTvInterval] = useState("5");

  const active = data?.active || [];
  const pending = data?.pending || [];
  const closed = data?.closed || [];
  const tradingZoneSignals = [...active, ...pending];
  const top = data?.top_trade || data?.top_pending || null;

  const selectedSignal = useMemo(() => {
    if (selectedSignalId) {
      const found = tradingZoneSignals.find((s) => s.id === selectedSignalId);
      if (found) return found;
    }

    return (
      active.find((s) => s.market === selectedPair) ||
      pending.find((s) => s.market === selectedPair) ||
      data?.latest_scan?.[selectedPair] ||
      top ||
      null
    );
  }, [active, pending, data, selectedPair, selectedSignalId, tradingZoneSignals, top]);

  async function loadEngine() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/pro-signals?interval=5m`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Engine HTTP ${res.status}`);
      const json: DashboardData = await res.json();
      setData(json);

      const preferred = json?.top_trade?.market || json?.top_pending?.market;
      if (preferred && !selectedSignalId) setSelectedPair(preferred);

      if (!selectedSignalId && (json?.top_trade?.id || json?.top_pending?.id)) {
        setSelectedSignalId(json?.top_trade?.id || json?.top_pending?.id || null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEngine();
    const id = setInterval(loadEngine, 12000);
    return () => clearInterval(id);
  }, []);

  const currentMarket = selectedSignal?.market || selectedPair;
  const currentSide = getTradeSide(selectedSignal);
  const currentEntry = getSimpleEntry(selectedSignal);
  const currentStop = getSimpleStop(selectedSignal);
  const currentTarget = getSimpleTarget(selectedSignal);
  const currentPrice =
    selectedSignal?.latest_price ??
    selectedSignal?.trigger_price ??
    selectedSignal?.entry;

  const desk1Signal = buildDeskSignal(selectedSignal, "DESK_1");
  const desk2Signal = buildDeskSignal(selectedSignal, "DESK_2");

  const chartSymbol = encodeURIComponent(PAIRS[currentMarket] || "OANDA:XAUUSD");
  const tradingViewUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${chartSymbol}&interval=${tvInterval}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0f172a&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1&studies_overrides={}&overrides={}&enabled_features=["study_templates"]&disabled_features=[]&locale=en`;

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-[1650px] px-4 py-4">
        <header className="mb-4 rounded-[28px] border border-white/10 bg-[#0b1627] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Easypips
              </p>
              <h1 className="mt-1 text-xl font-bold">Signals Dashboard</h1>
            </div>
            <div className="flex gap-2 text-xs text-slate-300">
              <Chip>{loading ? "Updating..." : "Live"}</Chip>
              <Chip>{currentMarket || "XAUUSD"}</Chip>
              <Chip>{data?.summary?.mode || "Balanced"}</Chip>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Panel tint="yellow" title="Selected Signal">
              {selectedSignal ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge>{selectedSignal.market || "No market"}</Badge>
                    <Badge
                      tone={
                        currentSide === "LONG"
                          ? "green"
                          : currentSide === "SHORT"
                          ? "red"
                          : "muted"
                      }
                    >
                      {selectedSignal.display_decision ||
                        selectedSignal.decision ||
                        "WAIT"}
                    </Badge>
                    <Badge>{selectedSignal.timeframe || "5m"}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <Stat label="Current Price" value={format(currentPrice)} />
                    <Stat label="Entry" value={format(currentEntry)} />
                    <Stat label="SL" value={format(currentStop)} tone="red" />
                    <Stat label="TP" value={format(currentTarget)} tone="green" />
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
                      Signal Explanation
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {selectedSignal.reasons?.length
                        ? selectedSignal.reasons.join(" • ")
                        : "Selected signal details will appear here."}
                    </p>
                  </div>
                </>
              ) : (
                <EmptyInline text="No signal selected. Click a signal from the Trading Zone." />
              )}
            </Panel>

            <Panel tint="green" title="Upcoming Active and Pending Signals">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#0f1c31] p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.22em] text-emerald-200/75">
                    Active
                  </p>
                  <div className="space-y-2">
                    {active.length ? (
                      active.slice(0, 6).map((signal, index) => (
                        <SignalRow
                          key={`active-${signal.id || signal.market || index}`}
                          signal={signal}
                          selected={selectedSignalId === signal.id}
                          onClick={() => {
                            if (signal.market) setSelectedPair(signal.market);
                            if (signal.id) setSelectedSignalId(signal.id);
                          }}
                        />
                      ))
                    ) : (
                      <EmptyInline text="No active signals." />
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0f1c31] p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.22em] text-yellow-200/75">
                    Pending
                  </p>
                  <div className="space-y-2">
                    {pending.length ? (
                      pending.slice(0, 6).map((signal, index) => (
                        <SignalRow
                          key={`pending-${signal.id || signal.market || index}`}
                          signal={signal}
                          selected={selectedSignalId === signal.id}
                          onClick={() => {
                            if (signal.market) setSelectedPair(signal.market);
                            if (signal.id) setSelectedSignalId(signal.id);
                          }}
                        />
                      ))
                    ) : (
                      <EmptyInline text="No pending signals." />
                    )}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel tint="green" title="Live Trading Chart">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTvInterval(tf.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      tvInterval === tf.value
                        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                        : "border-white/10 bg-white/5 text-slate-300"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
                <ToolbarChip label="TradingView Tools" active />
              </div>

              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#091425]">
                <iframe
                  key={`${currentMarket}-${tvInterval}`}
                  src={tradingViewUrl}
                  className="h-[530px] w-full"
                  allowFullScreen
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-5">
                <Stat label="Current" value={format(currentPrice)} />
                <Stat label="Entry" value={format(currentEntry)} />
                <Stat label="SL" value={format(currentStop)} tone="red" />
                <Stat label="TP" value={format(currentTarget)} tone="green" />
                <Stat label="Timeframe" value={tvInterval} />
              </div>
            </Panel>

            <Panel tint="purple" title="Trading Zone">
              <div className="space-y-3">
                {tradingZoneSignals.length ? (
                  tradingZoneSignals.slice(0, 10).map((signal, index) => {
                    const livePrice =
                      signal.latest_price ?? signal.trigger_price ?? signal.entry;

                    return (
                      <button
                        key={`${signal.id || signal.market || "signal"}-${index}`}
                        onClick={() => {
                          if (signal.market) setSelectedPair(signal.market);
                          if (signal.id) setSelectedSignalId(signal.id);
                        }}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          selectedSignalId === signal.id
                            ? "border-fuchsia-300/30 bg-fuchsia-300/10"
                            : "border-white/10 bg-[#0f1c31] hover:border-fuchsia-300/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-white">
                              {signal.market || "-"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {signal.display_decision || signal.decision || "WAIT"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">
                              {format(livePrice)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {signal.timeframe || "5m"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <EmptyInline text="No active or pending signals in the Trading Zone." />
                )}
              </div>
            </Panel>

            <Panel tint="purple" title="Trade History">
              <div className="space-y-2">
                {closed.length ? (
                  closed.slice(0, 8).map((s, i) => (
                    <HistoryRow key={`closed-${i}`} signal={s} />
                  ))
                ) : (
                  <EmptyInline text="No trade history yet." />
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel tint="purple" title="Desk 1 and Desk 2">
              <div className="space-y-4">
                <DeskCard signal={desk1Signal} />
                <DeskCard signal={desk2Signal} />
              </div>
            </Panel>

            <Panel tint="lightblue" title="Contact and More Info">
              <div className="space-y-3">
                <InfoRow label="Telegram" value="@easypips_ai" />
                <InfoRow label="Support" value="support@easypips.ai" />
                <InfoRow label="Trading Zone" value="Live AI and market flow" />
                <InfoRow label="Website" value="easypips-web.vercel.app" />
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function SignalRow({
  signal,
  selected,
  onClick,
}: {
  signal: SignalLike;
  selected: boolean;
  onClick: () => void;
}) {
  const side = getTradeSide(signal);

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left ${
        selected
          ? "border-emerald-300/35 bg-emerald-300/10"
          : "border-white/10 bg-[#091425]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">{signal.market || "-"}</p>
          <p className="text-xs text-slate-400">
            {signal.display_decision || signal.decision || "WAIT"}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
            side === "LONG"
              ? "bg-green-400/15 text-green-300"
              : side === "SHORT"
              ? "bg-red-400/15 text-red-300"
              : "bg-slate-500/15 text-slate-300"
          }`}
        >
          {side}
        </span>
      </div>
    </button>
  );
}

function DeskCard({ signal }: { signal: DeskSignal }) {
  return (
    <div className="rounded-[24px] border border-fuchsia-300/20 bg-[#0f1c31] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-200/75">
            {signal.title}
          </p>
          <h3 className="mt-2 text-xl font-bold text-white">{signal.trader}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{signal.about}</p>
        </div>
        <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-bold uppercase text-fuchsia-100">
          Live
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Stat label="Pair" value={signal.pair} />
        <Stat label="Bias" value={signal.side} />
        <Stat label="Entry" value={format(signal.entry)} />
        <Stat label="SL" value={format(signal.stopLoss)} tone="red" />
        <Stat label="TP" value={format(signal.target)} tone="green" />
        <Stat label="Time" value={signal.time} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
        {signal.note}
      </div>
    </div>
  );
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
      "border-yellow-400/25 bg-[linear-gradient(180deg,rgba(250,204,21,0.10),rgba(12,23,41,0.96))]",
    green:
      "border-emerald-400/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(12,23,41,0.96))]",
    purple:
      "border-fuchsia-400/20 bg-[linear-gradient(180deg,rgba(168,85,247,0.10),rgba(12,23,41,0.96))]",
    lightblue:
      "border-sky-300/25 bg-[linear-gradient(180deg,rgba(56,189,248,0.10),rgba(12,23,41,0.96))]",
  }[tint];

  return (
    <section className={`rounded-[28px] border p-4 shadow-2xl ${classes}`}>
      <p className="text-xs uppercase tracking-[0.26em] text-slate-400">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function HistoryRow({ signal }: { signal: SignalLike }) {
  const result = (signal.result || "").toUpperCase();
  const isTp = result.includes("TP") || result.includes("PROFIT");
  const isSl = result.includes("SL") || result.includes("STOP");

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-white">{signal.market || "-"}</p>
          <div className="mt-1">
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                isTp
                  ? "bg-green-400/15 text-green-300"
                  : isSl
                  ? "bg-red-400/15 text-red-300"
                  : "bg-slate-500/15 text-slate-300"
              }`}
            >
              {signal.result || "Closed"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-white">
            {format(signal.closed_price)}
          </p>
          <p className="text-xs text-slate-500">
            {signal.published_at
              ? new Date(signal.published_at).toLocaleString()
              : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
      {children}
    </span>
  );
}

function ToolbarChip({
  label,
  active,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
        active
          ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
          : "border-white/10 bg-white/5 text-slate-300"
      }`}
    >
      {label}
    </span>
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

function EmptyInline({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#091425] px-4 py-4 text-sm text-slate-400">
      {text}
    </div>
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
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
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

function getTradeSide(signal?: SignalLike | null) {
  const raw = `${signal?.display_decision || ""} ${signal?.decision || ""} ${signal?.bias || ""}`.toUpperCase();
  if (raw.includes("BUY")) return "LONG";
  if (raw.includes("SELL")) return "SHORT";
  return "NEUTRAL";
}

function getSimpleEntry(signal?: SignalLike | null) {
  return signal?.entry ?? signal?.trigger_price ?? signal?.latest_price;
}

function getSimpleStop(signal?: SignalLike | null) {
  return signal?.stop_loss;
}

function getSimpleTarget(signal?: SignalLike | null) {
  return signal?.tp1;
}

function buildDeskSignal(
  signal: SignalLike | null,
  desk: "DESK_1" | "DESK_2"
): DeskSignal {
  const side: "LONG" | "SHORT" =
    getTradeSide(signal) === "SHORT" ? "SHORT" : "LONG";

  const baseTime = signal?.published_at
    ? new Date(signal.published_at).toLocaleString()
    : new Date().toLocaleString();

  if (desk === "DESK_1") {
    return {
      title: "Desk 1",
      trader: "Doctor Rano",
      about: "Senior trader and market analyst.",
      side,
      pair: signal?.market || "XAUUSD",
      entry: getSimpleEntry(signal),
      stopLoss: getSimpleStop(signal),
      target: getSimpleTarget(signal),
      time: baseTime,
      note: "Patient entry, disciplined stop, and one clean target.",
    };
  }

  return {
    title: "Desk 2",
    trader: "Doctor Fahdi",
    about: "Execution focused trader and signal supervisor.",
    side,
    pair: signal?.market || "XAUUSD",
    entry: getSimpleEntry(signal),
    stopLoss: getSimpleStop(signal),
    target: getSimpleTarget(signal),
    time: baseTime,
    note: "Daily tactical execution with one entry, one stop, and one target.",
  };
}

function format(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  if (Math.abs(num) < 10) return num.toFixed(5);
  if (Math.abs(num) < 1000) return num.toFixed(3);
  return num.toFixed(2);
}