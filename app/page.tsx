"use client";

import { useEffect, useMemo, useState } from "react";

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

type DashboardSummary = {
  active_count?: number;
  pending_count?: number;
  closed_count?: number;
  updated_at?: string;
  min_active_confidence?: number;
  min_pending_confidence?: number;
  mode?: string;
};

type DashboardData = {
  latest_scan?: Record<string, SignalLike>;
  top_trade?: SignalLike | null;
  top_pending?: SignalLike | null;
  active?: SignalLike[];
  pending?: SignalLike[];
  closed?: SignalLike[];
  summary?: DashboardSummary;
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
        )}&interval=5m&limit=120`,
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
          <StatusPill
            label="Engine"
            value={debug.engineStatus}
            ok={debug.engineStatus === "200"}
          />
          <StatusPill
            label="Chart"
            value={debug.chartStatus}
            ok={debug.chartStatus === "200"}
          />
          <StatusPill label="Selected Pair" value={selectedPair} />
          <StatusPill
            label="Mode"
            value={data?.summary?.mode || "BALANCED"}
          />
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
            Live active signals, pending orders, stop loss, targets, confidence,
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
            <span className="rounded-full bg-green-400/15 px-3 py-2 text-xs font-extrabold uppercase text-green-300">
              {data?.summary?.mode || "Live"}
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
                <span
                  className={`rounded-full px-3 py-2 text-xs font-extrabold uppercase ${
                    String(top?.display_decision || "").includes("BUY")
                      ? "bg-green-400/15 text-green-300"
                      : String(top?.display_decision || "").includes("SELL")
                      ? "bg-red-400/15 text-red-300"
                      : "bg-yellow-400/15 text-yellow-300"
                  }`}
                >
                  {top?.confidence !== undefined ? `${top.confidence}%` : "—"}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <MiniRow label="Type" value={top?.display_decision || "-"} />
                <MiniRow label="Entry" value={format(top?.entry ?? top?.trigger_price)} />
                <MiniRow label="Stop Loss" value={format(top?.stop_loss)} danger />
                <MiniRow label="TP1" value={format(top?.tp1)} success />
                <MiniRow label="Expiry" value={formatTime(top?.valid_until)} />
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

          {top?.reasons?.length ? (
            <div className="mt-4 rounded-3xl border border-white/10 bg-[#0c1729] p-4">
              <p className="text-xs uppercase tracking-widest text-slate-400">
                Why this setup
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {top.reasons.slice(0, 3).map((reason, i) => (
                  <li key={i}>• {reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
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

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1729] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Live Chart
                </p>
                <h3 className="text-xl font-bold">{selectedPair}</h3>
                <p className="text-sm text-slate-500">{selectedPairMeta}</p>
              </div>

              {top?.market && (
                <button
                  onClick={() => top.market && setSelectedPair(top.market)}
                  className="rounded-2xl bg-teal-300 px-4 py-2 font-bold text-slate-950"
                >
                  Show Top Signal
                </button>
              )}
            </div>

            <div className="p-4">
              <ChartPanel
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
                <Level
                  label={
                    selectedSignal?.trigger_price !== undefined
                      ? "Entry / Trigger"
                      : "Entry"
                  }
                  value={selectedSignal?.entry ?? selectedSignal?.trigger_price}
                />
                <Level label="Stop Loss" value={selectedSignal?.stop_loss} danger />
                <Level label="TP1" value={selectedSignal?.tp1} success />
                <Level label="TP2" value={selectedSignal?.tp2} success />
                <Level label="TP3" value={selectedSignal?.tp3} success />
              </div>
            </Panel>

            <Panel title="Signal Meta">
              <div className="grid gap-3">
                <MiniInfo
                  label="Decision"
                  value={
                    selectedSignal?.display_decision ||
                    selectedSignal?.decision ||
                    "WATCHLIST"
                  }
                />
                <MiniInfo
                  label="Latest Price"
                  value={format(selectedSignal?.latest_price)}
                />
                <MiniInfo
                  label="Confidence"
                  value={
                    selectedSignal?.confidence !== undefined
                      ? `${selectedSignal.confidence}%`
                      : "-"
                  }
                />
                <MiniInfo
                  label="Risk"
                  value={selectedSignal?.risk || selectedSignal?.status || "-"}
                />
                <MiniInfo
                  label="Expiry"
                  value={formatTime(selectedSignal?.valid_until)}
                />
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

function ChartPanel({
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
  if (loading) {
    return (
      <div className="grid h-[560px] place-items-center rounded-[24px] border border-white/10 bg-[#091425] text-slate-400">
        Loading chart...
      </div>
    );
  }

  if (!candles.length) {
    return (
      <div className="grid h-[560px] place-items-center rounded-[24px] border border-white/10 bg-[#091425] text-slate-400">
        No chart data for {pair}.
      </div>
    );
  }

  const width = 980;
  const height = 520;
  const padTop = 28;
  const padRight = 64;
  const padBottom = 34;
  const padLeft = 18;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);

  const levels = [
    signal?.entry ?? signal?.trigger_price,
    signal?.stop_loss,
    signal?.tp1,
    signal?.tp2,
    signal?.tp3,
  ].filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

  const minPrice = Math.min(...lows, ...(levels.length ? levels : [Number.MAX_SAFE_INTEGER]));
  const maxPrice = Math.max(...highs, ...(levels.length ? levels : [0]));
  const priceRange = maxPrice - minPrice || 1;

  const candleGap = innerWidth / candles.length;
  const candleWidth = Math.max(3, candleGap * 0.58);

  const y = (price: number) =>
    padTop + ((maxPrice - price) / priceRange) * innerHeight;

  const x = (index: number) => padLeft + index * candleGap + candleGap / 2;

  const gridPrices = Array.from({ length: 6 }, (_, i) =>
    maxPrice - (priceRange / 5) * i
  );

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#091425] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">
            5m Candles
          </p>
          <h4 className="text-lg font-bold text-white">{pair}</h4>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <LegendBadge label="Bullish" color="bg-green-400" />
          <LegendBadge label="Bearish" color="bg-red-400" />
          {signal?.entry || signal?.trigger_price ? (
            <LegendBadge label="Entry" color="bg-cyan-300" />
          ) : null}
          {signal?.stop_loss ? (
            <LegendBadge label="Stop" color="bg-red-300" />
          ) : null}
          {signal?.tp1 ? <LegendBadge label="TP" color="bg-green-300" /> : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[520px] min-w-[860px] w-full"
          role="img"
          aria-label={`Candlestick chart for ${pair}`}
        >
          <rect x="0" y="0" width={width} height={height} fill="#091425" rx="18" />

          {gridPrices.map((p, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                x2={width - padRight + 8}
                y1={y(p)}
                y2={y(p)}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="4 6"
              />
              <text
                x={width - padRight + 14}
                y={y(p) + 4}
                fill="#7dd3fc"
                fontSize="12"
                fontFamily="monospace"
              >
                {format(p)}
              </text>
            </g>
          ))}

          {signal?.entry || signal?.trigger_price ? (
            <PriceLine
              y={y((signal.entry ?? signal.trigger_price) as number)}
              label={`ENTRY ${format(signal.entry ?? signal.trigger_price)}`}
              color="#67e8f9"
              width={width}
              padLeft={padLeft}
              padRight={padRight}
            />
          ) : null}

          {signal?.stop_loss ? (
            <PriceLine
              y={y(signal.stop_loss)}
              label={`SL ${format(signal.stop_loss)}`}
              color="#fca5a5"
              width={width}
              padLeft={padLeft}
              padRight={padRight}
            />
          ) : null}

          {signal?.tp1 ? (
            <PriceLine
              y={y(signal.tp1)}
              label={`TP1 ${format(signal.tp1)}`}
              color="#86efac"
              width={width}
              padLeft={padLeft}
              padRight={padRight}
            />
          ) : null}

          {signal?.tp2 ? (
            <PriceLine
              y={y(signal.tp2)}
              label={`TP2 ${format(signal.tp2)}`}
              color="#4ade80"
              width={width}
              padLeft={padLeft}
              padRight={padRight}
            />
          ) : null}

          {signal?.tp3 ? (
            <PriceLine
              y={y(signal.tp3)}
              label={`TP3 ${format(signal.tp3)}`}
              color="#22c55e"
              width={width}
              padLeft={padLeft}
              padRight={padRight}
            />
          ) : null}

          {candles.map((candle, index) => {
            const bullish = candle.close >= candle.open;
            const color = bullish ? "#4ade80" : "#f87171";
            const cx = x(index);
            const wickTop = y(candle.high);
            const wickBottom = y(candle.low);
            const bodyTop = y(Math.max(candle.open, candle.close));
            const bodyBottom = y(Math.min(candle.open, candle.close));
            const bodyHeight = Math.max(2, bodyBottom - bodyTop);

            return (
              <g key={`${candle.time}-${index}`}>
                <line
                  x1={cx}
                  x2={cx}
                  y1={wickTop}
                  y2={wickBottom}
                  stroke={color}
                  strokeWidth="1.5"
                />
                <rect
                  x={cx - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  rx="1.5"
                  fill={color}
                />
              </g>
            );
          })}

          {candles.length >= 6
            ? candles
                .filter((_, i) => i % Math.ceil(candles.length / 6) === 0)
                .map((c, i) => {
                  const index = candles.findIndex((x) => x.time === c.time);
                  return (
                    <text
                      key={i}
                      x={x(index)}
                      y={height - 10}
                      fill="#64748b"
                      fontSize="11"
                      textAnchor="middle"
                    >
                      {formatShortTime(c.time)}
                    </text>
                  );
                })
            : null}
        </svg>
      </div>
    </div>
  );
}

function PriceLine({
  y,
  label,
  color,
  width,
  padLeft,
  padRight,
}: {
  y: number;
  label: string;
  color: string;
  width: number;
  padLeft: number;
  padRight: number;
}) {
  return (
    <g>
      <line
        x1={padLeft}
        x2={width - padRight}
        y1={y}
        y2={y}
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="8 6"
      />
      <rect
        x={width - padRight - 120}
        y={y - 12}
        width="110"
        height="22"
        rx="8"
        fill="#07111f"
        stroke={color}
        strokeWidth="1"
      />
      <text
        x={width - padRight - 65}
        y={y + 3}
        fill={color}
        fontSize="11"
        fontFamily="monospace"
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
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
    <div className="rounded-2xl border border-white/10 bg-[#0f1c31] p-4">
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
  const decision = String(s.display_decision || s.decision || "");
  const isBuy = decision.includes("BUY");
  const isSell = decision.includes("SELL");

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
            isBuy
              ? "bg-green-400/15 text-green-300"
              : isSell
              ? "bg-red-400/15 text-red-300"
              : "bg-yellow-400/15 text-yellow-300"
          }`}
        >
          {decision || "WAIT"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Level
          label={pending ? "Trigger" : "Entry"}
          value={s.entry ?? s.trigger_price}
        />
        <Level label="Stop Loss" value={s.stop_loss} danger />
        <Level label="TP1" value={s.tp1} success />
        <Level label="Confidence" value={`${confidence}%`} />
      </div>

      {!!s.reasons?.length && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#0f1c31] p-3">
          <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">
            Reasons
          </p>
          <ul className="space-y-1 text-sm text-slate-300">
            {s.reasons.slice(0, 2).map((reason, i) => (
              <li key={i}>• {reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 h-2 rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-teal-400 to-cyan-300"
          style={{ width: `${Math.min(confidence, 100)}%` }}
        />
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
      <MiniRow label="Entry" value={format(s.entry ?? s.trigger_price)} />
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
  return <div className="rounded-2xl bg-[#0f1c31] px-4 py-4 text-sm text-slate-400">{text}</div>;
}

function format(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  if (Math.abs(num) < 10) return num.toFixed(5);
  if (Math.abs(num) < 1000) return num.toFixed(3);
  return num.toFixed(2);
}

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 16);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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