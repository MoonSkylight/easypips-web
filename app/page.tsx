"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-engine.onrender.com";

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

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type CandleResponse = {
  market?: string;
  interval?: string;
  candles?: Candle[];
};

type DeskSignal = {
  side: "LONG" | "SHORT";
  entry?: number;
  stopLoss?: number;
  target?: number;
  note: string;
  time: string;
};

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [selectedPair, setSelectedPair] = useState("XAUUSD");
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  const active = data?.active || [];
  const pending = data?.pending || [];
  const closed = data?.closed || [];
  const combinedSignals = [...active, ...pending];
  const top = data?.top_trade || data?.top_pending || null;

  const selectedSignal = useMemo(() => {
    if (selectedSignalId) {
      const found = combinedSignals.find((s) => s.id === selectedSignalId);
      if (found) return found;
    }

    return (
      active.find((s) => s.market === selectedPair) ||
      pending.find((s) => s.market === selectedPair) ||
      data?.latest_scan?.[selectedPair] ||
      top ||
      null
    );
  }, [active, pending, data, selectedPair, selectedSignalId, combinedSignals, top]);

  async function loadEngine() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/pro-signals?interval=5m`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Engine HTTP ${res.status}`);
      const json: DashboardData = await res.json();
      setData(json);

      const preferred =
        json?.top_trade?.market || json?.top_pending?.market || selectedPair;

      if (preferred) setSelectedPair(preferred);

      if (!selectedSignalId && (json?.top_trade?.id || json?.top_pending?.id)) {
        setSelectedSignalId(json?.top_trade?.id || json?.top_pending?.id || null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadChart(market: string) {
    setChartLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/candles?market=${encodeURIComponent(
          market
        )}&interval=5m&limit=180`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Chart HTTP ${res.status}`);
      const json: CandleResponse = await res.json();
      setCandles(Array.isArray(json?.candles) ? json.candles : []);
    } catch {
      setCandles([]);
    } finally {
      setChartLoading(false);
    }
  }

  useEffect(() => {
    loadEngine();
    const id = setInterval(loadEngine, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (selectedPair) loadChart(selectedPair);
  }, [selectedPair]);

  const entryValue = getSimpleEntry(selectedSignal);
  const stopValue = getSimpleStop(selectedSignal);
  const targetValue = getSimpleTarget(selectedSignal);
  const side = getTradeSide(selectedSignal);

  const desk1Signal = buildDeskSignal(selectedSignal, "RANO");
  const desk2Signal = buildDeskSignal(selectedSignal, "FAHDI");

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        <header className="mb-4 rounded-[28px] border border-white/10 bg-[#0b1627] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                EasyPips
              </p>
              <h1 className="mt-1 text-xl font-bold">Signals Dashboard</h1>
            </div>
            <div className="flex gap-2 text-xs text-slate-300">
              <Chip>{loading ? "Updating..." : "Live"}</Chip>
              <Chip>{selectedPair}</Chip>
              <Chip>{data?.summary?.mode || "Balanced"}</Chip>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <Panel tint="blue" title="Active and Pending Orders">
              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-xs uppercase tracking-[0.22em] text-blue-200/70">
                    Active
                  </p>
                  <div className="space-y-2">
                    {active.length ? (
                      active.map((s, i) => (
                        <SignalListItem
                          key={`a-${i}`}
                          signal={s}
                          selected={selectedSignal?.id === s.id}
                          onClick={() => {
                            if (s.market) setSelectedPair(s.market);
                            if (s.id) setSelectedSignalId(s.id);
                          }}
                        />
                      ))
                    ) : (
                      <EmptyInline text="No active signals." />
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs uppercase tracking-[0.22em] text-blue-200/70">
                    Pending
                  </p>
                  <div className="space-y-2">
                    {pending.length ? (
                      pending.map((s, i) => (
                        <SignalListItem
                          key={`p-${i}`}
                          signal={s}
                          selected={selectedSignal?.id === s.id}
                          onClick={() => {
                            if (s.market) setSelectedPair(s.market);
                            if (s.id) setSelectedSignalId(s.id);
                          }}
                        />
                      ))
                    ) : (
                      <EmptyInline text="No pending orders." />
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel tint="yellow" title="Selected Signal">
              <div className="flex flex-wrap items-center gap-3">
                <Badge>{selectedSignal?.market || "No signal"}</Badge>
                <Badge
                  tone={
                    side === "LONG"
                      ? "green"
                      : side === "SHORT"
                      ? "red"
                      : "muted"
                  }
                >
                  {selectedSignal?.display_decision ||
                    selectedSignal?.decision ||
                    "WAIT"}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <Stat label="Entry" value={format(entryValue)} />
                <Stat label="SL" value={format(stopValue)} tone="red" />
                <Stat label="TP" value={format(targetValue)} tone="green" />
                <Stat
                  label="Confidence"
                  value={
                    selectedSignal?.confidence != null
                      ? `${selectedSignal.confidence}%`
                      : "-"
                  }
                />
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                {selectedSignal?.reasons?.length
                  ? selectedSignal.reasons.slice(0, 2).join(" • ")
                  : "Click any order on the left to show full trade details in this yellow bar."}
              </p>
            </Panel>

            <Panel tint="green" title="Live Chart">
              <ChartBox candles={candles} loading={chartLoading} signal={selectedSignal} />
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <Stat label="Entry" value={format(entryValue)} />
                <Stat label="SL" value={format(stopValue)} tone="red" />
                <Stat label="TP" value={format(targetValue)} tone="green" />
                <Stat label="Timeframe" value={selectedSignal?.timeframe || "5m"} />
              </div>
            </Panel>

            <Panel tint="purple" title="Trade History">
              <div className="space-y-2">
                {closed.length ? (
                  closed.slice(0, 6).map((s, i) => (
                    <HistoryRow key={`c-${i}`} signal={s} />
                  ))
                ) : (
                  <EmptyInline text="No closed trades yet." />
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel tint="red" title="Desk 1 and Desk 2">
              <div className="space-y-4">
                <DeskCard
                  title="Desk 1"
                  trader="Doctor Rano"
                  about="Senior trader and market analyst."
                  pair={selectedPair}
                  signal={desk1Signal}
                />
                <DeskCard
                  title="Desk 2"
                  trader="Doctor Fahdi"
                  about="Execution focused trader and signal supervisor."
                  pair={selectedPair}
                  signal={desk2Signal}
                />
              </div>
            </Panel>

            <Panel tint="lightblue" title="Contact and More Info">
              <div className="space-y-3">
                <InfoRow label="Telegram" value="@easypips_ai" />
                <InfoRow label="Support" value="support@easypips.ai" />
                <InfoRow label="Website" value="easypips-web.vercel.app" />
                <InfoRow label="Hours" value="Mon - Fri · Market hours" />
                <button className="mt-2 w-full rounded-2xl bg-sky-300 px-4 py-3 font-bold text-slate-950">
                  Contact Us
                </button>
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({
  title,
  tint,
  children,
}: {
  title: string;
  tint: "yellow" | "blue" | "green" | "purple" | "lightblue" | "red";
  children: React.ReactNode;
}) {
  const classes = {
    yellow:
      "border-yellow-400/25 bg-[linear-gradient(180deg,rgba(250,204,21,0.10),rgba(12,23,41,0.96))]",
    blue:
      "border-blue-400/25 bg-[linear-gradient(180deg,rgba(59,130,246,0.10),rgba(12,23,41,0.96))]",
    green:
      "border-emerald-400/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(12,23,41,0.96))]",
    purple:
      "border-fuchsia-400/20 bg-[linear-gradient(180deg,rgba(168,85,247,0.10),rgba(12,23,41,0.96))]",
    lightblue:
      "border-sky-300/25 bg-[linear-gradient(180deg,rgba(56,189,248,0.10),rgba(12,23,41,0.96))]",
    red:
      "border-rose-400/25 bg-[linear-gradient(180deg,rgba(244,63,94,0.10),rgba(12,23,41,0.96))]",
  }[tint];

  return (
    <section className={`rounded-[28px] border p-4 shadow-2xl ${classes}`}>
      <p className="text-xs uppercase tracking-[0.26em] text-slate-400">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ChartBox({
  candles,
  signal,
  loading,
}: {
  candles: Candle[];
  signal: SignalLike | null;
  loading: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const linesRef = useRef<IPriceLine[]>([]);

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 460,
      layout: {
        background: { color: "#091425" },
        textColor: "#8fa3bf",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (!ref.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: ref.current.clientWidth });
      chartRef.current.timeScale().fitContent();
    });

    ro.observe(ref.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      linesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    const data = candles
      .map((c) => {
        const t = new Date(c.time).getTime();
        if (Number.isNaN(t)) return null;
        return {
          time: Math.floor(t / 1000) as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        };
      })
      .filter(Boolean) as {
      time: UTCTimestamp;
      open: number;
      high: number;
      low: number;
      close: number;
    }[];

    series.setData(data);
    chart.timeScale().fitContent();

    linesRef.current.forEach((l) => {
      try {
        series.removePriceLine(l);
      } catch {}
    });
    linesRef.current = [];

    const add = (price: number | undefined, color: string, title: string) => {
      if (typeof price !== "number") return;
      const line = series.createPriceLine({
        price,
        color,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title,
      });
      linesRef.current.push(line);
    };

    add(getSimpleEntry(signal), "#67e8f9", "ENTRY");
    add(getSimpleStop(signal), "#fda4af", "SL");
    add(getSimpleTarget(signal), "#86efac", "TP");
  }, [candles, signal]);

  if (loading) {
    return (
      <div className="grid h-[460px] place-items-center rounded-[24px] border border-white/10 bg-[#091425] text-slate-400">
        Loading chart...
      </div>
    );
  }

  if (!candles.length) {
    return (
      <div className="grid h-[460px] place-items-center rounded-[24px] border border-white/10 bg-[#091425] text-slate-400">
        No chart data.
      </div>
    );
  }

  return <div ref={ref} className="h-[460px] w-full rounded-[24px] border border-white/10 bg-[#091425] p-2" />;
}

function SignalListItem({
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
          ? "border-blue-300/35 bg-blue-300/10"
          : "border-white/10 bg-[#0f1c31]"
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

function DeskCard({
  title,
  trader,
  about,
  pair,
  signal,
}: {
  title: string;
  trader: string;
  about: string;
  pair: string;
  signal: DeskSignal;
}) {
  return (
    <div className="rounded-[24px] border border-rose-300/20 bg-[#0f1c31] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-rose-200/75">
            {title}
          </p>
          <h3 className="mt-2 text-xl font-bold text-white">{trader}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{about}</p>
        </div>
        <span className="rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1.5 text-xs font-bold uppercase text-rose-100">
          Live
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Stat label="Pair" value={pair} />
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

function HistoryRow({ signal }: { signal: SignalLike }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-white">{signal.market || "-"}</p>
          <p className="text-xs text-slate-400">{signal.result || "Closed"}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-white">{format(signal.closed_price)}</p>
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
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-4 text-sm text-slate-400">
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
  desk: "RANO" | "FAHDI"
): DeskSignal {
  const side: "LONG" | "SHORT" =
    getTradeSide(signal) === "SHORT" ? "SHORT" : "LONG";

  const entry = getSimpleEntry(signal);
  const stop = getSimpleStop(signal);
  const target = getSimpleTarget(signal);

  return {
    side,
    entry: typeof entry === "number" ? entry : undefined,
    stopLoss: typeof stop === "number" ? stop : undefined,
    target: typeof target === "number" ? target : undefined,
    note:
      desk === "RANO"
        ? "Patient entry, disciplined stop, and one clean target."
        : "Daily tactical execution with one entry, one stop, and one target.",
    time: signal?.published_at
      ? new Date(signal.published_at).toLocaleString()
      : new Date().toLocaleString(),
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