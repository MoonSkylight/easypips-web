"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
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
  enginePreview: string;
  chartPreview: string;
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
  const [engineLoading, setEngineLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [debugOpen, setDebugOpen] = useState(false);

  const [debug, setDebug] = useState<DebugState>({
    engineStatus: "loading",
    chartStatus: "loading",
    engineError: "none",
    chartError: "none",
    enginePreview: "No engine payload yet.",
    chartPreview: "No chart payload yet.",
  });

  const active = data?.active || [];
  const pending = data?.pending || [];
  const closed = data?.closed || [];
  const top = data?.top_trade || data?.top_pending || null;

  const selectedSignal = useMemo(() => {
    return (
      active.find((s) => s.market === selectedPair) ||
      pending.find((s) => s.market === selectedPair) ||
      data?.latest_scan?.[selectedPair] ||
      null
    );
  }, [active, pending, data, selectedPair]);

  async function loadEngine() {
    setEngineLoading(true);

    let nextEngineStatus = "loading";
    let nextEngineError = "none";
    let nextEnginePreview = "No engine payload yet.";

    try {
      const res = await fetch(`${API_URL}/pro-signals?interval=5m`, {
        cache: "no-store",
      });

      nextEngineStatus = String(res.status);

      if (!res.ok) {
        throw new Error(`Engine HTTP ${res.status}`);
      }

      const json: DashboardData = await res.json();
      setData(json);
      nextEnginePreview = safePreview(json);

      const preferred =
        json?.top_trade?.market ||
        json?.top_pending?.market ||
        selectedPair;

      if (preferred && PAIRS[preferred]) {
        setSelectedPair((current) => {
          if (!current || !PAIRS[current]) return preferred;
          return current;
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch";
      nextEngineError = message;
      nextEngineStatus = "failed";
      setData(null);
    } finally {
      setDebug((prev) => ({
        ...prev,
        engineStatus: nextEngineStatus,
        engineError: nextEngineError,
        enginePreview: nextEnginePreview,
      }));
      setEngineLoading(false);
    }
  }

  async function loadChart(market: string) {
    setChartLoading(true);

    let nextChartStatus = "loading";
    let nextChartError = "none";
    let nextChartPreview = "No chart payload yet.";

    try {
      const res = await fetch(
        `${API_URL}/candles?market=${encodeURIComponent(
          market
        )}&interval=5m&limit=180`,
        { cache: "no-store" }
      );

      nextChartStatus = String(res.status);

      if (!res.ok) {
        throw new Error(`Chart HTTP ${res.status}`);
      }

      const json: CandleResponse = await res.json();
      const rows = Array.isArray(json?.candles) ? json.candles : [];
      setCandles(rows);
      nextChartPreview = safePreview(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch";
      nextChartError = message;
      nextChartStatus = "failed";
      setCandles([]);
    } finally {
      setDebug((prev) => ({
        ...prev,
        chartStatus: nextChartStatus,
        chartError: nextChartError,
        chartPreview: nextChartPreview,
      }));
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
  const scannerTitle = top
    ? `${top.market} · ${top.display_decision || top.decision || "LIVE"}`
    : "Waiting for setup";

  const side = getTradeSide(selectedSignal);
  const entryValue = getSimpleEntry(selectedSignal);
  const stopValue = getSimpleStop(selectedSignal);
  const targetValue = getSimpleTarget(selectedSignal);

  const deskAllowed = isDeskPair(selectedPair);
  const desk1Signal = buildDeskSignal(selectedSignal, "RANO");
  const desk2Signal = buildDeskSignal(selectedSignal, "FAHDI");

  return (
    <main className="min-h-screen bg-[#07111f] text-[#eef4ff]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
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

      <section className="mx-auto max-w-7xl px-5 pt-6">
        <div className="grid gap-3 md:grid-cols-4">
          <StatusPill label="Engine" value={debug.engineStatus} ok={debug.engineStatus === "200"} />
          <StatusPill label="Chart" value={debug.chartStatus} ok={debug.chartStatus === "200"} />
          <StatusPill label="Selected Pair" value={selectedPair} />
          <StatusPill label="Mode" value={data?.summary?.mode || "BALANCED"} />
        </div>

        {debugOpen ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <DebugBox title="Errors">
              <p className="text-sm text-slate-300">
                Engine: <span className="font-mono text-white">{debug.engineError}</span>
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Chart: <span className="font-mono text-white">{debug.chartError}</span>
              </p>
            </DebugBox>

            <DebugBox title="Payload Preview">
              <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">
                Engine payload
              </p>
              <pre className="max-h-32 overflow-auto rounded-2xl bg-[#0f1c31] p-3 text-xs text-cyan-200">
                {debug.enginePreview}
              </pre>
              <p className="mb-2 mt-4 text-xs uppercase tracking-widest text-slate-500">
                Chart payload
              </p>
              <pre className="max-h-32 overflow-auto rounded-2xl bg-[#0f1c31] p-3 text-xs text-cyan-200">
                {debug.chartPreview}
              </pre>
            </DebugBox>
          </div>
        ) : null}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            <span
              className={`h-2.5 w-2.5 rounded-full shadow-[0_0_18px_rgba(34,197,94,0.7)] ${
                debug.engineStatus === "200" ? "bg-green-400" : "bg-red-400"
              }`}
            />
            Engine {debug.engineStatus === "200" ? "online" : "offline"} · Auto refresh 10s
          </div>

          <h2 className="max-w-3xl text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
            AI forex signals with clean execution and visible risk.
          </h2>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Live active signals, pending orders, stop loss, target, confidence,
            expiry and chart levels in one professional dashboard.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Stat label="Active Signals" value={active.length} />
            <Stat label="Pending Orders" value={pending.length} />
            <Stat label="Closed Results" value={closed.length} />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">
                Live AI scanner
              </p>
              <h3 className="text-xl font-bold">{scannerTitle}</h3>
            </div>
            <span
              className={`rounded-full px-3 py-2 text-xs font-extrabold uppercase ${
                side === "LONG"
                  ? "bg-green-400/15 text-green-300"
                  : side === "SHORT"
                  ? "bg-red-400/15 text-red-300"
                  : "bg-yellow-400/15 text-yellow-300"
              }`}
            >
              {side === "LONG" ? "LONG" : side === "SHORT" ? "SHORT" : "LIVE"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-[#0c1729] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">
                    Top setup
                  </p>
                  <h4 className="mt-2 text-2xl font-bold">{top?.market || "No signal"}</h4>
                  <p className="mt-1 text-sm text-slate-400">
                    {top?.display_decision || "Waiting for a strong setup"}
                  </p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-2 text-xs font-extrabold uppercase text-teal-300">
                  {top?.confidence !== undefined ? `${top.confidence}%` : "—"}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <MiniRow label="Type" value={top?.display_decision || "-"} />
                <MiniRow label="Entry" value={format(getSimpleEntry(top))} />
                <MiniRow label="Stop Loss" value={format(getSimpleStop(top))} danger />
                <MiniRow label="Take Profit" value={format(getSimpleTarget(top))} success />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0c1729] p-4">
              <p className="text-xs uppercase tracking-widest text-slate-400">
                Watchlist
              </p>
              <div className="mt-3 space-y-1">
                {Object.keys(PAIRS).slice(0, 8).map((pair) => (
                  <button
                    key={pair}
                    onClick={() => setSelectedPair(pair)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                      selectedPair === pair
                        ? "bg-teal-300 text-slate-950"
                        : "text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <span className="font-semibold">{pair}</span>
                    <span
                      className={`text-xs font-mono ${
                        selectedPair === pair ? "text-slate-900" : "text-teal-300"
                      }`}
                    >
                      {selectedPair === pair ? "LIVE" : "VIEW"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-2">
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.keys(PAIRS).map((pair) => (
            <button
              key={pair}
              onClick={() => setSelectedPair(pair)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                selectedPair === pair
                  ? "bg-teal-300 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {pair}
            </button>
          ))}
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Panel title={`Daily Trade Levels · ${selectedSignal?.market || selectedPair}`}>
            <div className="grid gap-3 md:grid-cols-3">
              <Level label="Entry" value={entryValue} />
              <Level label="Stop Loss" value={stopValue} danger />
              <Level label="Take Profit" value={targetValue} success />
            </div>
          </Panel>

          <Panel title="Senior Traders Desk">
            {deskAllowed ? (
              <div className="grid gap-4 md:grid-cols-2">
                <SimpleDeskCard
                  title="Desk 1"
                  trader="Doctor Rano"
                  about="Senior trader with 12 years experience."
                  accent="sky"
                  pair={selectedPair}
                  signal={desk1Signal}
                />
                <SimpleDeskCard
                  title="Desk 2"
                  trader="Doctor Fahdi"
                  about="Senior trader focused on disciplined daily market execution."
                  accent="amber"
                  pair={selectedPair}
                  signal={desk2Signal}
                />
              </div>
            ) : (
              <EmptyInline text="Senior trader desk signals are available only for Gold, Oil, and Nasdaq." />
            )}
          </Panel>
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1729] shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Trading Chart
                </p>
                <h3 className="text-2xl font-bold">{selectedPair}</h3>
                <p className="text-sm text-slate-500">{selectedPairMeta} · 5 minute view</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <LegendBadge label="Bullish" color="bg-green-400" />
                <LegendBadge label="Bearish" color="bg-red-400" />
                {top?.market && (
                  <button
                    onClick={() => top.market && setSelectedPair(top.market)}
                    className="rounded-2xl bg-teal-300 px-4 py-2 font-bold text-slate-950"
                  >
                    Show Top Signal
                  </button>
                )}
              </div>
            </div>

            <div className="p-4">
              <TradingViewLikeChart
                candles={candles}
                signal={selectedSignal}
                loading={chartLoading}
                pair={selectedPair}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Panel title={`Trade Levels · ${selectedSignal?.market || selectedPair}`}>
              <div className="grid gap-3">
                <Level label="Entry" value={entryValue} />
                <Level label="Stop Loss" value={stopValue} danger />
                <Level label="Take Profit" value={targetValue} success />
              </div>
            </Panel>

            <Panel title="Reasons">
              {selectedSignal?.reasons?.length ? (
                <ul className="space-y-2 text-sm text-slate-300">
                  {selectedSignal.reasons.slice(0, 5).map((reason, i) => (
                    <li key={i} className="rounded-2xl bg-[#0f1c31] px-4 py-3">
                      {reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyInline text="No reasons available for this pair yet." />
              )}
            </Panel>
          </div>
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
            active.map((s, i) => (
              <SignalCard
                key={`a-${i}`}
                s={s}
                onClick={() => s.market && setSelectedPair(s.market)}
              />
            ))
          ) : (
            <Empty text="No active signals right now." />
          )}
        </div>

        <h3 className="mb-3 text-xl font-bold text-yellow-300">Pending Orders</h3>
        <div className="mb-8 grid gap-5 md:grid-cols-3">
          {pending.length ? (
            pending.map((s, i) => (
              <SignalCard
                key={`p-${i}`}
                s={s}
                pending
                onClick={() => s.market && setSelectedPair(s.market)}
              />
            ))
          ) : (
            <Empty text="No pending orders right now." />
          )}
        </div>

        <h3 className="mb-3 text-xl font-bold text-blue-400">Closed Results</h3>
        <div className="grid gap-5 md:grid-cols-3">
          {closed.length ? (
            closed.map((s, i) => <ClosedCard key={`c-${i}`} s={s} />)
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
      height: 620,
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
      <div className="grid h-[620px] place-items-center rounded-[24px] border border-white/10 bg-[#091425] text-slate-400">
        Loading chart...
      </div>
    );
  }

  if (!candles.length) {
    return (
      <div className="grid h-[620px] place-items-center rounded-[24px] border border-white/10 bg-[#091425] text-slate-400">
        No chart data for {pair}.
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#091425] p-2">
      <div ref={chartContainerRef} className="h-[620px] w-full" />
    </div>
  );
}

function SimpleDeskCard({
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
  accent: "sky" | "amber";
  pair: string;
  signal: DeskSignal;
}) {
  const accentClasses =
    accent === "sky"
      ? {
          badge: "border-sky-300/20 bg-sky-300/10 text-sky-100",
          button: "bg-sky-300 text-slate-950",
        }
      : {
          badge: "border-amber-300/20 bg-amber-300/10 text-amber-100",
          button: "bg-amber-300 text-slate-950",
        };

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#0f1c31] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{title}</p>
          <h4 className="mt-2 text-xl font-bold text-white">{trader}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">{about}</p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${accentClasses.badge}`}>
          Live
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <MiniInfo label="Pair" value={pair} />
        <MiniInfo label="Bias" value={signal.side} />
        <MiniInfo label="Entry" value={format(signal.entry)} />
        <MiniInfo label="Stop Loss" value={format(signal.stopLoss)} />
        <MiniInfo label="Take Profit" value={format(signal.target)} />
        <MiniInfo label="Time" value={signal.time} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
        {signal.note}
      </div>

      <button
        className={`mt-4 w-full rounded-2xl px-4 py-3 font-bold ${accentClasses.button}`}
      >
        Chat with {trader}
      </button>
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
    <div className="rounded-[28px] border border-white/10 bg-[#0c1729] p-4 shadow-2xl">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-400">{title}</p>
      {children}
    </div>
  );
}

function LegendBadge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
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

function DebugBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-xl">
      <p className="mb-3 text-xs uppercase tracking-widest text-slate-400">{title}</p>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1729] p-5 shadow-xl">
      <p className="text-sm text-slate-400">{label}</p>
      <strong className="mt-2 block text-3xl">{value}</strong>
    </div>
  );
}

function MiniRow({
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
    <div className="flex justify-between gap-4 rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={`text-right font-mono font-bold ${
          success ? "text-green-400" : danger ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#12233d] p-4">
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Level({
  label,
  value,
  success,
  danger,
}: {
  label: string;
  value: number | string | undefined;
  success?: boolean;
  danger?: boolean;
}) {
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

function SignalCard({
  s,
  pending = false,
  onClick,
}: {
  s: SignalLike;
  pending?: boolean;
  onClick: () => void;
}) {
  const confidence = Number(s.confidence || 0);
  const side = getTradeSide(s);

  return (
    <button
      onClick={onClick}
      className="rounded-3xl border border-white/10 bg-[#0c1729] p-5 text-left shadow-xl transition hover:-translate-y-1 hover:border-teal-300/60"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">
            {pending ? "Pending order" : "Live signal"}
          </p>
          <h3 className="mt-1 text-2xl font-bold">{s.market || "-"}</h3>
          <p className="mt-1 text-sm text-slate-500">{s.timeframe || "5m"}</p>
        </div>
        <span
          className={`rounded-full px-3 py-2 text-xs font-extrabold uppercase ${
            side === "LONG"
              ? "bg-green-400/15 text-green-300"
              : side === "SHORT"
              ? "bg-red-400/15 text-red-300"
              : "bg-yellow-400/15 text-yellow-300"
          }`}
        >
          {s.display_decision || s.decision || "WAIT"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Level label="Entry" value={getSimpleEntry(s)} />
        <Level label="Stop Loss" value={getSimpleStop(s)} danger />
        <Level label="Take Profit" value={getSimpleTarget(s)} success />
        <Level label="Confidence" value={`${confidence}%`} />
      </div>
    </button>
  );
}

function ClosedCard({ s }: { s: SignalLike }) {
  const result = String(s.result || "CLOSED");
  const good = result.includes("TP");
  const bad = result.includes("STOP");

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1729] p-5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xl font-bold">{s.market || "-"}</h3>
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
      <MiniRow label="Entry" value={format(getSimpleEntry(s))} />
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

function EmptyInline({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-[#0f1c31] px-4 py-4 text-sm text-slate-400">
      {text}
    </div>
  );
}

function isDeskPair(pair: string) {
  return ["XAUUSD", "OIL", "NASDAQ"].includes(pair);
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

function safePreview(input: unknown, limit = 1400) {
  try {
    const text = JSON.stringify(input);
    if (!text) return "No payload yet.";
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
  } catch {
    return "Preview unavailable.";
  }
}