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

type ManualSignalDraft = {
  trader: "Doctor Rano" | "Doctor Fahdi";
  pair: string;
  side: "BUY" | "SELL";
  entry: string;
  sl: string;
  tp: string;
  note: string;
};

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [selectedPair, setSelectedPair] = useState("XAUUSD");
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  const [draft, setDraft] = useState<ManualSignalDraft>({
    trader: "Doctor Rano",
    pair: "XAUUSD",
    side: "BUY",
    entry: "",
    sl: "",
    tp: "",
    note: "",
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
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/pro-signals?interval=5m`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Engine HTTP ${res.status}`);
      const json: DashboardData = await res.json();
      setData(json);
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
        )}&interval=5m&limit=220`,
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
    const id = setInterval(loadEngine, 12000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const pairToLoad = selectedSignal?.market || selectedPair;
    if (pairToLoad) loadChart(pairToLoad);
  }, [selectedPair, selectedSignal?.market]);

  const clickedSignal = selectedSignal;
  const currentMarket = clickedSignal?.market || selectedPair;
  const currentSide = getTradeSide(clickedSignal);
  const currentEntry = getSimpleEntry(clickedSignal);
  const currentStop = getSimpleStop(clickedSignal);
  const currentTarget = getSimpleTarget(clickedSignal);
  const currentPrice = getCurrentPrice(clickedSignal, candles);

  function quickFill(side: "BUY" | "SELL") {
    const live = currentPrice ?? currentEntry;
    setDraft((prev) => ({
      ...prev,
      side,
      pair: currentMarket || "XAUUSD",
      entry: live ? String(live) : "",
      sl: currentStop ? String(currentStop) : "",
      tp: currentTarget ? String(currentTarget) : "",
    }));
  }

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

        <section className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Panel tint="blue" title="Senior Trade Control">
              <div className="space-y-4">
                <p className="text-sm leading-6 text-slate-300">
                  This area is kept clean for senior traders only. Use these controls to prepare and publish signals manually.
                </p>

                <div className="grid gap-2">
                  <button
                    onClick={() => quickFill("BUY")}
                    className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950"
                  >
                    Add Buy Signal
                  </button>
                  <button
                    onClick={() => quickFill("SELL")}
                    className="rounded-2xl bg-rose-400 px-4 py-3 text-sm font-bold text-slate-950"
                  >
                    Add Sell Signal
                  </button>
                  <button className="rounded-2xl border border-blue-300/25 bg-blue-300/10 px-4 py-3 text-sm font-semibold text-blue-100">
                    Publish Senior Signal
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0f1c31] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Room Notes
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Waiting for senior traders to prepare and publish new signals.
                  </p>
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel tint="yellow" title="Selected Signal">
              {clickedSignal ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge>{clickedSignal.market || "No market"}</Badge>
                    <Badge tone={currentSide === "LONG" ? "green" : currentSide === "SHORT" ? "red" : "muted"}>
                      {clickedSignal.display_decision || clickedSignal.decision || "WAIT"}
                    </Badge>
                    <Badge>{clickedSignal.timeframe || "5m"}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <Stat label="Current Price" value={format(currentPrice)} />
                    <Stat label="Entry" value={format(currentEntry)} />
                    <Stat label="SL" value={format(currentStop)} tone="red" />
                    <Stat label="TP" value={format(currentTarget)} tone="green" />
                    <Stat
                      label="Confidence"
                      value={
                        clickedSignal?.confidence != null
                          ? `${clickedSignal.confidence}%`
                          : "-"
                      }
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Signal Logic
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {clickedSignal.reasons?.length
                        ? clickedSignal.reasons.join(" • ")
                        : "Signal selected. Detailed reasoning will appear here."}
                    </p>
                  </div>
                </>
              ) : (
                <EmptyInline text="Click a signal from the Trading Room to show the selected signal information here." />
              )}
            </Panel>

            <Panel tint="green" title="Live Trading Chart">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <ToolbarChip label="1m" />
                <ToolbarChip label="5m" active />
                <ToolbarChip label="15m" />
                <ToolbarChip label="Indicators" />
                <ToolbarChip label="Trendline" />
                <ToolbarChip label="Fib" />
                <ToolbarChip label="Crosshair" />
              </div>

              <ChartBox
                candles={candles}
                loading={chartLoading}
                signal={clickedSignal}
              />

              <div className="mt-4 grid gap-3 md:grid-cols-5">
                <Stat label="Current" value={format(currentPrice)} />
                <Stat label="Entry" value={format(currentEntry)} />
                <Stat label="SL" value={format(currentStop)} tone="red" />
                <Stat label="TP" value={format(currentTarget)} tone="green" />
                <Stat label="Timeframe" value={clickedSignal?.timeframe || "5m"} />
              </div>
            </Panel>

            <Panel tint="purple" title="Trading Room">
              <div className="space-y-3">
                {combinedSignals.length ? (
                  combinedSignals.slice(0, 8).map((signal, index) => (
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
                            {format(getCurrentPrice(signal, candles) ?? getSimpleEntry(signal))}
                          </p>
                          <p className="text-xs text-slate-500">
                            {signal.timeframe || "5m"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <EmptyInline text="No live signals available yet for the trading room." />
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
                  <EmptyInline text="No closed history yet." />
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel tint="red" title="Trading Room Publish Board">
              <div className="space-y-4">
                <div className="rounded-[24px] border border-rose-300/20 bg-[#0f1c31] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-rose-200/75">
                        Senior Signal Publisher
                      </p>
                      <h3 className="mt-2 text-xl font-bold text-white">
                        Manual Trade Entry
                      </h3>
                    </div>
                    <span className="rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1.5 text-xs font-bold uppercase text-rose-100">
                      Senior Only
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <select
                      value={draft.trader}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          trader: e.target.value as "Doctor Rano" | "Doctor Fahdi",
                        }))
                      }
                      className="rounded-2xl border border-white/10 bg-[#091425] px-4 py-3 text-sm outline-none"
                    >
                      <option>Doctor Rano</option>
                      <option>Doctor Fahdi</option>
                    </select>

                    <input
                      value={draft.pair}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, pair: e.target.value }))
                      }
                      placeholder="Pair"
                      className="rounded-2xl border border-white/10 bg-[#091425] px-4 py-3 text-sm outline-none"
                    />

                    <select
                      value={draft.side}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          side: e.target.value as "BUY" | "SELL",
                        }))
                      }
                      className="rounded-2xl border border-white/10 bg-[#091425] px-4 py-3 text-sm outline-none"
                    >
                      <option>BUY</option>
                      <option>SELL</option>
                    </select>

                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        value={draft.entry}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, entry: e.target.value }))
                        }
                        placeholder="Entry"
                        className="rounded-2xl border border-white/10 bg-[#091425] px-4 py-3 text-sm outline-none"
                      />
                      <input
                        value={draft.sl}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, sl: e.target.value }))
                        }
                        placeholder="SL"
                        className="rounded-2xl border border-white/10 bg-[#091425] px-4 py-3 text-sm outline-none"
                      />
                      <input
                        value={draft.tp}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, tp: e.target.value }))
                        }
                        placeholder="TP"
                        className="rounded-2xl border border-white/10 bg-[#091425] px-4 py-3 text-sm outline-none"
                      />
                    </div>

                    <textarea
                      value={draft.note}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, note: e.target.value }))
                      }
                      placeholder="Trader note"
                      rows={4}
                      className="rounded-2xl border border-white/10 bg-[#091425] px-4 py-3 text-sm outline-none"
                    />

                    <button className="rounded-2xl bg-rose-300 px-4 py-3 font-bold text-slate-950">
                      Publish To Trading Room
                    </button>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel tint="lightblue" title="Contact and More Info">
              <div className="space-y-3">
                <InfoRow label="Telegram" value="@easypips_ai" />
                <InfoRow label="Support" value="support@easypips.ai" />
                <InfoRow label="Trading Room" value="Senior private publishing room" />
                <InfoRow label="Website" value="easypips-web.vercel.app" />
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
      height: 430,
      layout: {
        background: { color: "#091425" },
        textColor: "#8fa3bf",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
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

    const add = (
      price: number | undefined,
      color: string,
      title: string,
      style: LineStyle = LineStyle.Dashed
    ) => {
      if (typeof price !== "number") return;
      const line = series.createPriceLine({
        price,
        color,
        lineWidth: 2,
        lineStyle: style,
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
      <div className="grid h-[430px] place-items-center rounded-[24px] border border-white/10 bg-[#091425] text-slate-400">
        Loading live chart...
      </div>
    );
  }

  if (!candles.length) {
    return (
      <div className="grid h-[430px] place-items-center rounded-[24px] border border-white/10 bg-[#091425] text-slate-400">
        No live chart data available.
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#091425] p-2">
      <div ref={ref} className="h-[430px] w-full" />
    </div>
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

function getCurrentPrice(signal?: SignalLike | null, candles?: Candle[]) {
  const lastCandle = candles?.[candles.length - 1];
  return lastCandle?.close ?? signal?.latest_price ?? signal?.trigger_price ?? signal?.entry;
}

function format(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  if (Math.abs(num) < 10) return num.toFixed(5);
  if (Math.abs(num) < 1000) return num.toFixed(3);
  return num.toFixed(2);
}