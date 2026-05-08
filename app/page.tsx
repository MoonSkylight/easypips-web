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
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const PAIRS: Record<string, string> = {
  XAUUSD: "Gold",
  EURUSD: "Euro / US Dollar",
  GBPUSD: "Pound / US Dollar",
  USDJPY: "US Dollar / Yen",
  GBPJPY: "Pound / Yen",
  EURJPY: "Euro / Yen",
  NASDAQ: "Nasdaq",
  SP500: "S&P 500",
  OIL: "Oil",
  AUDUSD: "Aussie / US Dollar",
  NZDUSD: "NZD / US Dollar",
  USDCHF: "US Dollar / Swiss Franc",
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

type DebugState = {
  engineStatus: string;
  chartStatus: string;
  engineError: string;
  chartError: string;
};

type DeskId = "RANO" | "FAHDI";

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
  const [engineLoading, setEngineLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [debugOpen, setDebugOpen] = useState(false);

  const [debug, setDebug] = useState<DebugState>({
    engineStatus: "loading",
    chartStatus: "loading",
    engineError: "none",
    chartError: "none",
  });

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
    setEngineLoading(true);

    try {
      const res = await fetch(`${API_URL}/pro-signals?interval=5m`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Engine HTTP ${res.status}`);
      }

      const json: DashboardData = await res.json();
      setData(json);

      const preferred =
        json?.top_trade?.market ||
        json?.top_pending?.market ||
        selectedPair;

      if (preferred && PAIRS[preferred]) {
        setSelectedPair(preferred);
      }

      if (!selectedSignalId) {
        const preferredSignal = json?.top_trade || json?.top_pending || null;
        if (preferredSignal?.id) setSelectedSignalId(preferredSignal.id);
      }

      setDebug((prev) => ({
        ...prev,
        engineStatus: String(res.status),
        engineError: "none",
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch";
      setData(null);
      setDebug((prev) => ({
        ...prev,
        engineStatus: "failed",
        engineError: message,
      }));
    } finally {
      setEngineLoading(false);
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

      if (!res.ok) {
        throw new Error(`Chart HTTP ${res.status}`);
      }

      const json: CandleResponse = await res.json();
      setCandles(Array.isArray(json?.candles) ? json.candles : []);

      setDebug((prev) => ({
        ...prev,
        chartStatus: String(res.status),
        chartError: "none",
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch";
      setCandles([]);
      setDebug((prev) => ({
        ...prev,
        chartStatus: "failed",
        chartError: message,
      }));
    } finally {
      setChartLoading(false);
    }
  }

  async function refreshAll() {
    await loadEngine();
    await loadChart(selectedPair);
  }

  useEffect(() => {
    loadEngine();
    const id = setInterval(loadEngine, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedPair) return;
    loadChart(selectedPair);
  }, [selectedPair]);

  const selectedPairMeta = PAIRS[selectedPair] || selectedPair;
  const side = getTradeSide(selectedSignal);
  const entryValue = getSimpleEntry(selectedSignal);
  const stopValue = getSimpleStop(selectedSignal);
  const targetValue = getSimpleTarget(selectedSignal);

  const desk1Signal = buildDeskSignal(selectedSignal, "RANO");
  const desk2Signal = buildDeskSignal(selectedSignal, "FAHDI");

  return (
    <main className="min-h-screen bg-[#07111f] text-[#eef4ff]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-teal-400/30 bg-teal-400/10 text-lg text-teal-300">
              ↗
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">EasyPips AI</h1>
              <p className="text-xs text-slate-400">AI Forex Signals Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDebugOpen((v) => !v)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200"
            >
              {debugOpen ? "Hide Debug" : "Debug"}
            </button>
            <button
              onClick={refreshAll}
              className="rounded-2xl bg-teal-300 px-5 py-3 font-bold text-slate-950"
            >
              {engineLoading ? "Updating..." : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-5 pt-5">
        <div className="grid gap-3 md:grid-cols-4">
          <StatusPill label="Engine" value={debug.engineStatus} ok={debug.engineStatus === "200"} />
          <StatusPill label="Chart" value={debug.chartStatus} ok={debug.chartStatus === "200"} />
          <StatusPill label="Selected Pair" value={selectedPair} />
          <StatusPill label="Mode" value={data?.summary?.mode || "BALANCED"} />
        </div>

        {debugOpen ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <DebugCard title="Engine Error" value={debug.engineError} />
            <DebugCard title="Chart Error" value={debug.chartError} />
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-[1500px] px-5 py-5">
        <HighlightPanel
          tint="yellow"
          title="Selected Signal"
          subtitle="Full trade information appears here when customer clicks a signal."
        >
          <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1.5 text-xs font-bold uppercase text-yellow-100">
                  {selectedSignal?.market || selectedPair}
                </span>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase ${
                    side === "LONG"
                      ? "bg-green-400/15 text-green-300"
                      : side === "SHORT"
                      ? "bg-red-400/15 text-red-300"
                      : "bg-slate-400/15 text-slate-300"
                  }`}
                >
                  {selectedSignal?.display_decision || selectedSignal?.decision || "WAIT"}
                </span>
              </div>

              <h2 className="mt-4 text-3xl font-extrabold text-white">
                {selectedSignal?.market || "No signal selected"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                {selectedSignal?.reasons?.length
                  ? selectedSignal.reasons.slice(0, 2).join(" • ")
                  : "Choose an active or pending signal to show complete trade details in this highlighted area."}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <MiniStat label="Entry" value={format(entryValue)} />
              <MiniStat label="Stop Loss" value={format(stopValue)} danger />
              <MiniStat label="Take Profit" value={format(targetValue)} success />
              <MiniStat
                label="Confidence"
                value={
                  selectedSignal?.confidence !== undefined
                    ? `${selectedSignal.confidence}%`
                    : "-"
                }
              />
            </div>
          </div>
        </HighlightPanel>
      </section>

      <section className="mx-auto max-w-[1500px] px-5 pb-10">
        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_330px]">
          <div className="space-y-5">
            <HighlightPanel
              tint="blue"
              title="Active & Pending Orders"
              subtitle="Customer clicks any signal to show full information above."
            >
              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-xs uppercase tracking-[0.22em] text-blue-200/70">
                    Active Signals
                  </p>
                  <div className="space-y-2">
                    {active.length ? (
                      active.map((s, i) => (
                        <SignalListItem
                          key={`active-${i}`}
                          signal={s}
                          selected={selectedSignal?.id === s.id}
                          onClick={() => {
                            if (s.market) setSelectedPair(s.market);
                            if (s.id) setSelectedSignalId(s.id);
                          }}
                        />
                      ))
                    ) : (
                      <EmptyInline text="No active signals right now." />
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs uppercase tracking-[0.22em] text-blue-200/70">
                    Pending Orders
                  </p>
                  <div className="space-y-2">
                    {pending.length ? (
                      pending.map((s, i) => (
                        <SignalListItem
                          key={`pending-${i}`}
                          signal={s}
                          selected={selectedSignal?.id === s.id}
                          onClick={() => {
                            if (s.market) setSelectedPair(s.market);
                            if (s.id) setSelectedSignalId(s.id);
                          }}
                        />
                      ))
                    ) : (
                      <EmptyInline text="No pending orders right now." />
                    )}
                  </div>
                </div>
              </div>
            </HighlightPanel>

            <HighlightPanel
              tint="lightblue"
              title="Contact & More Info"
              subtitle="Telegram, contact details and customer support area."
            >
              <div className="space-y-3">
                <ContactRow label="Telegram" value="@easypips_ai" />
                <ContactRow label="Support" value="support@easypips.ai" />
                <ContactRow label="Website" value="easypips-web.vercel.app" />
                <ContactRow label="Hours" value="Mon - Fri · Market hours" />
                <button className="mt-2 w-full rounded-2xl bg-sky-300 px-4 py-3 font-bold text-slate-950">
                  Contact Us
                </button>
              </div>
            </HighlightPanel>
          </div>

          <div className="space-y-5">
            <HighlightPanel
              tint="green"
              title="Live Chart"
              subtitle={`${selectedPair} · ${selectedPairMeta} · Entry / SL / TP shown with the live chart`}
            >
              <TradingViewLikeChart
                candles={candles}
                signal={selectedSignal}
                loading={chartLoading}
                pair={selectedPair}
              />

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <MiniStat label="Entry" value={format(entryValue)} />
                <MiniStat label="Stop Loss" value={format(stopValue)} danger />
                <MiniStat label="Take Profit" value={format(targetValue)} success />
                <MiniStat
                  label="Timeframe"
                  value={selectedSignal?.timeframe || "5m"}
                />
              </div>
            </HighlightPanel>

            <HighlightPanel
              tint="purple"
              title="Trade History"
              subtitle="Recent closed trades, outcomes and results history."
            >
              <div className="space-y-2">
                {closed.length ? (
                  closed.slice(0, 6).map((s, i) => (
                    <HistoryRow key={`closed-${i}`} signal={s} />
                  ))
                ) : (
                  <EmptyInline text="No closed results yet." />
                )}
              </div>
            </HighlightPanel>
          </div>

          <div className="space-y-5">
            <HighlightPanel
              tint="red"
              title="Desk 1 & Desk 2"
              subtitle="Senior traders area with separate information cards."
            >
              <div className="space-y-4">
                <DeskCard
                  title="Desk 1"
                  trader="Doctor Rano"
                  about="Senior trader with 12 years experience."
                  accent="red"
                  pair={selectedPair}
                  signal={desk1Signal}
                />
                <DeskCard
                  title="Desk 2"
                  trader="Doctor Fahdi"
                  about="Senior trader focused on disciplined daily market execution."
                  accent="red"
                  pair={selectedPair}
                  signal={desk2Signal}
                />
              </div>
            </HighlightPanel>
          </div>
        </div>
      </section>
    </main>
  );
}

function HighlightPanel({
  title,
  subtitle,
  tint,
  children,
}: {
  title: string;
  subtitle: string;
  tint: "yellow" | "blue" | "green" | "purple" | "lightblue" | "red";
  children: React.ReactNode;
}) {
  const theme = {
    yellow:
      "border-yellow-400/25 shadow-[0_0_0_1px_rgba(250,204,21,0.08)] bg-[linear-gradient(180deg,rgba(250,204,21,0.10),rgba(12,23,41,0.94))]",
    blue:
      "border-blue-400/25 shadow-[0_0_0_1px_rgba(96,165,250,0.08)] bg-[linear-gradient(180deg,rgba(59,130,246,0.10),rgba(12,23,41,0.94))]",
    green:
      "border-emerald-400/25 shadow-[0_0_0_1px_rgba(52,211,153,0.08)] bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(12,23,41,0.94))]",
    purple:
      "border-fuchsia-400/20 shadow-[0_0_0_1px_rgba(217,70,239,0.08)] bg-[linear-gradient(180deg,rgba(168,85,247,0.10),rgba(12,23,41,0.94))]",
    lightblue:
      "border-sky-300/25 shadow-[0_0_0_1px_rgba(125,211,252,0.08)] bg-[linear-gradient(180deg,rgba(56,189,248,0.10),rgba(12,23,41,0.94))]",
    red:
      "border-rose-400/25 shadow-[0_0_0_1px_rgba(251,113,133,0.08)] bg-[linear-gradient(180deg,rgba(244,63,94,0.10),rgba(12,23,41,0.94))]",
  }[tint];

  return (
    <section className={`rounded-[28px] border p-4 shadow-2xl ${theme}`}>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{title}</p>
        <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function TradingViewLikeChart({
  candles,
  signal,
  loading,
  pair,
}: {
  candles: Candle[];
  signal: SignalLike | null;
  loading: boolean;
  pair: string;
}) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: "#091425" },
        textColor: "#8fa3bf",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "rgba(148,163,184,0.35)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#0f172a",
        },
        horzLine: {
          color: "rgba(148,163,184,0.35)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#0f172a",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 7,
        minBarSpacing: 5,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      borderVisible: true,
      priceLineVisible: true,
      lastValueVisible: true,
      priceFormat: {
        type: "price",
        precision: 3,
        minMove: 0.001,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candlestickSeries;

    const resizeObserver = new ResizeObserver(() => {
      if (!chartContainerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
      chartRef.current.timeScale().fitContent();
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return;

    priceLinesRef.current.forEach((line) => {
      try {
        series.removePriceLine(line);
      } catch {}
    });
    priceLinesRef.current = [];

    const seriesData = candles
      .map((candle) => {
        const ts = toUnixTime(candle.time);
        if (!ts) return null;
        return {
          time: ts,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        };
      })
      .filter(Boolean) as {
      time: UTCTimestamp;
      open: number;
      high: number;
      low: number;
      close: number;
    }[];

    series.setData(seriesData);
    chart.timeScale().fitContent();

    const priceValues = [
      ...seriesData.map((c) => c.high),
      ...seriesData.map((c) => c.low),
      getSimpleEntry(signal),
      getSimpleStop(signal),
      getSimpleTarget(signal),
    ].filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

    if (priceValues.length) {
      const max = Math.max(...priceValues);
      const min = Math.min(...priceValues);
      const range = Math.max(max - min, 0.0001);

      series.applyOptions({
        autoscaleInfoProvider: () => ({
          priceRange: {
            minValue: min - range * 0.08,
            maxValue: max + range * 0.08,
          },
        }),
      });
    }

    const createLevel = (
      price: number | undefined,
      color: string,
      title: string,
      lineStyle: LineStyle
    ) => {
      if (typeof price !== "number") return;
      const line = series.createPriceLine({
        price,
        color,
        lineWidth: 2,
        lineStyle,
        axisLabelVisible: true,
        title,
      });
      priceLinesRef.current.push(line);
    };

    createLevel(getSimpleEntry(signal), "#67e8f9", "ENTRY", LineStyle.Dashed);
    createLevel(getSimpleStop(signal), "#fda4af", "SL", LineStyle.Dashed);
    createLevel(getSimpleTarget(signal), "#86efac", "TP", LineStyle.Dashed);
  }, [candles, signal, pair]);

  if (loading) {
    return (
      <div className="grid h-[500px] place-items-center rounded-[24px] border border-white/10 bg-[#091425] text-slate-400">
        Loading chart...
      </div>
    );
  }

  if (!candles.length) {
    return (
      <div className="grid h-[500px] place-items-center rounded-[24px] border border-white/10 bg-[#091425] text-slate-400">
        No chart data for {pair}.
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#091425] p-2">
      <div ref={chartContainerRef} className="h-[500px] w-full" />
    </div>
  );
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
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        selected
          ? "border-blue-300/35 bg-blue-300/10"
          : "border-white/10 bg-[#0f1c31] hover:border-blue-400/30 hover:bg-[#12233d]"
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
  accent,
  pair,
  signal,
}: {
  title: string;
  trader: string;
  about: string;
  accent: "red";
  pair: string;
  signal: DeskSignal;
}) {
  return (
    <div className="rounded-[24px] border border-rose-300/20 bg-[#0f1c31] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-rose-200/75">{title}</p>
          <h4 className="mt-2 text-xl font-bold text-white">{trader}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">{about}</p>
        </div>
        <span className="rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1.5 text-xs font-bold uppercase text-rose-100">
          Live
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <MiniStat label="Pair" value={pair} />
        <MiniStat label="Bias" value={signal.side} />
        <MiniStat label="Entry" value={format(signal.entry)} />
        <MiniStat label="Stop Loss" value={format(signal.stopLoss)} danger />
        <MiniStat label="Take Profit" value={format(signal.target)} success />
        <MiniStat label="Time" value={signal.time} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
        {signal.note}
      </div>

      <button className="mt-4 w-full rounded-2xl bg-rose-300 px-4 py-3 font-bold text-slate-950">
        Chat with {trader}
      </button>
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
            {signal.published_at ? new Date(signal.published_at).toLocaleString() : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusPill({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-bold ${ok ? "text-green-300" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function DebugCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-xs uppercase tracking-widest text-slate-500">{title}</p>
      <p className="mt-2 text-sm text-slate-300">{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  success,
  danger,
}: {
  label: string;
  value: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p
        className={`mt-2 text-sm font-bold ${
          success ? "text-green-400" : danger ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyInline({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-4 text-sm text-slate-400">
      {text}
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

function buildDeskSignal(signal: SignalLike | null, desk: DeskId): DeskSignal {
  const side = getTradeSide(signal) === "SHORT" ? "SHORT" : "LONG";
  const baseEntry = getSimpleEntry(signal);
  const baseStop = getSimpleStop(signal);
  const baseTarget = getSimpleTarget(signal);
  const tweak = desk === "RANO" ? 0 : 1;

  return {
    side,
    entry: typeof baseEntry === "number" ? baseEntry : undefined,
    stopLoss:
      typeof baseStop === "number"
        ? tweak === 0
          ? baseStop
          : baseStop * 1.0002
        : undefined,
    target:
      typeof baseTarget === "number"
        ? tweak === 0
          ? baseTarget
          : baseTarget * 0.9998
        : undefined,
    note:
      desk === "RANO"
        ? "Patient entry, disciplined stop placement, and one clean target."
        : "Daily tactical execution with one entry, one stop, and one target.",
    time: signal?.published_at
      ? new Date(signal.published_at).toLocaleString()
      : new Date().toLocaleString(),
  };
}

function toUnixTime(value: string): UTCTimestamp | null {
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000) as UTCTimestamp;
}

function format(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  if (Math.abs(num) < 10) return num.toFixed(5);
  if (Math.abs(num) < 1000) return num.toFixed(3);
  return num.toFixed(2);
}