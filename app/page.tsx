"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const TIMEFRAMES = [
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
];

type StrategyVote = {
  direction?: string;
  score?: number;
  reasons?: string[];
};

type Signal = {
  id?: string;
  market?: string;
  timeframe?: string;
  decision?: string;
  signal_quality?: string;
  entry?: number | null;
  stop_loss?: number | null;
  stoploss?: number | null;
  tp1?: number | null;
  tp2?: number | null;
  tp3?: number | null;
  confidence?: number;
  risk?: string;
  rr_to_tp1?: number | null;
  spread_warning?: string;
  news_warning?: string;
  reasons?: string[];
  strategy_votes?: Record<string, StrategyVote>;
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
  tp1_hit?: boolean;
  tp2_hit?: boolean;
  tp3_hit?: boolean;
};

type DashboardData = {
  pair_prices?: Record<string, number | null>;
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
};

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [intervalValue, setIntervalValue] = useState("5m");
  const [loading, setLoading] = useState(true);

  async function loadData(nextInterval?: string) {
    const interval = nextInterval || intervalValue;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/pro-signals?interval=${interval}`, {
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
    loadData(intervalValue);
    const timer = setInterval(() => loadData(intervalValue), 12000);
    return () => clearInterval(timer);
  }, [intervalValue]);

  const activeSignals = useMemo(() => {
    const source = data?.active || [];
    return source
      .filter((signal) => {
        const status = (signal.status || "").toUpperCase();
        const result = (signal.result || "").toUpperCase();
        return (
          status === "ACTIVE" ||
          status === "RUNNER" ||
          result === "OPEN" ||
          result.includes("TP")
        );
      })
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }, [data]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4 lg:px-5">
        <header className="mb-5">
          <h1 className="text-[22px] font-extrabold tracking-tight">
            EasyPips AI Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Free signal preview. Unlock full trade plan for $3.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Last updated:{" "}
            {data?.summary?.updated_at
              ? new Date(data.summary.updated_at).toLocaleTimeString()
              : "—"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {TIMEFRAMES.map((item) => (
              <button
                key={item.value}
                onClick={() => setIntervalValue(item.value)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  intervalValue === item.value
                    ? "bg-[#0f2340] text-white"
                    : "bg-white/10 text-slate-200 hover:bg-white/15"
                }`}
              >
                {item.label}
              </button>
            ))}

            <button
              onClick={() => loadData(intervalValue)}
              className="rounded-xl bg-[#2f80ff] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1f6ae0]"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <section>
          {activeSignals.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {activeSignals.map((signal, index) => (
                <SignalCard key={signal.id || `${signal.market}-${index}`} signal={signal} />
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-[#0d2a57] bg-[#020816] p-6 text-sm text-slate-400">
              No confirmed active signals right now. Pending orders are still running in the
              background and will appear here automatically once triggered active.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const isBuy = getSide(signal) === "BUY";
  const isSell = getSide(signal) === "SELL";
  const confidence = Math.max(0, Math.min(signal.confidence || 0, 100));
  const votes = Object.entries(signal.strategy_votes || {});
  const hiddenPremium = confidence < 80;

  return (
    <article className="rounded-[18px] border border-[#0d2a57] bg-[#020816] p-4 shadow-[0_0_0_1px_rgba(10,30,60,0.15)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[30px] font-extrabold leading-none tracking-tight">
            {signal.market || "-"}
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Timeframe: {signal.timeframe || "5m"}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] ${
            isBuy
              ? "bg-[#14d25d] text-black"
              : isSell
              ? "bg-[#ff3b3b] text-white"
              : "bg-[#ffd21f] text-black"
          }`}
        >
          {getBadgeText(signal)}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>Confidence: {confidence}%</span>
          {signal.tp1_hit || signal.tp2_hit || signal.tp3_hit ? (
            <span className="text-emerald-300">
              {signal.tp3_hit
                ? "TP3 Hit"
                : signal.tp2_hit
                ? "TP2 Hit"
                : "TP1 Hit"}
            </span>
          ) : null}
        </div>

        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#172845]">
          <div
            className={`h-full rounded-full ${
              isBuy
                ? "bg-white"
                : isSell
                ? "bg-white"
                : "bg-[#d7dde8]"
            }`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {hiddenPremium ? (
        <div className="mt-4 rounded-[14px] border border-[#5b4304] bg-[linear-gradient(180deg,rgba(77,60,18,0.65),rgba(36,29,13,0.85))] p-4">
          <p className="text-sm font-extrabold text-[#ffd21f]">
            Premium Signal Locked
          </p>
          <p className="mt-2 text-xs leading-5 text-[#ddd3ae]">
            Unlock entry, stop loss, TP1, TP2, TP3 and full AI reason.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 opacity-35 blur-[2px]">
            <BlurRow />
            <BlurRow />
            <BlurRow />
            <BlurRow />
          </div>

          <button className="mt-4 w-full rounded-xl bg-[#ffcc16] px-4 py-3 text-sm font-extrabold text-black">
            Unlock for $3
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <InfoItem label="Entry" value={formatPrice(signal.market, signal.entry ?? signal.trigger_price)} />
            <InfoItem label="SL" value={formatPrice(signal.market, signal.stop_loss ?? signal.stoploss)} />
            <InfoItem label="TP1" value={formatPrice(signal.market, signal.tp1)} />
            <InfoItem label="TP2" value={formatPrice(signal.market, signal.tp2)} />
            <InfoItem label="TP3" value={formatPrice(signal.market, signal.tp3)} />
            <InfoItem label="Risk" value={signal.risk || "LOW"} />
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold text-white">Reason:</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              {signal.reasons?.length
                ? signal.reasons.join(" • ")
                : "Confirmed signal is active and currently being tracked."}
            </p>
          </div>

          {votes.length ? (
            <div className="mt-4">
              <p className="text-xs font-bold text-white">Strategy Votes:</p>

              <div className="mt-2 space-y-2">
                {votes.slice(0, 4).map(([name, vote]) => (
                  <VoteBox key={name} name={name} vote={vote} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <MiniTag>{signal.status || "ACTIVE"}</MiniTag>
            {signal.result ? <MiniTag>{cleanText(signal.result)}</MiniTag> : null}
            {signal.tp1_hit ? <MiniTag>TP1 HIT</MiniTag> : null}
            {signal.tp2_hit ? <MiniTag>TP2 HIT</MiniTag> : null}
            {signal.tp3_hit ? <MiniTag>TP3 HIT</MiniTag> : null}
          </div>
        </>
      )}
    </article>
  );
}

function VoteBox({
  name,
  vote,
}: {
  name: string;
  vote: StrategyVote;
}) {
  const direction = (vote.direction || "WAIT").toUpperCase();
  const score = vote.score ?? 0;

  return (
    <div className="rounded-[12px] bg-[#0b1730] px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-white">{name.replaceAll("_", " ")}</p>
        <p className="text-[11px] font-bold text-slate-300">
          {direction} / {score}
        </p>
      </div>
      <p className="mt-1 text-[11px] leading-5 text-slate-400">
        {vote.reasons?.length ? vote.reasons.join(" • ") : "No reason supplied."}
      </p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}: {value}</p>
    </div>
  );
}

function BlurRow() {
  return (
    <div className="space-y-1">
      <div className="h-3 w-20 rounded bg-[#c3b38a]" />
      <div className="h-3 w-16 rounded bg-[#c3b38a]" />
    </div>
  );
}

function MiniTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#11203a] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-200">
      {children}
    </span>
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

function getBadgeText(signal?: Signal | null) {
  const side = getSide(signal);
  if (side === "BUY") return "BUY";
  if (side === "SELL") return "SELL";
  return "WAIT";
}

function cleanText(value?: string | null) {
  if (!value) return "-";
  return value.replaceAll("_", " ");
}

function formatPrice(market: string | undefined, value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);

  if (!market) return num.toFixed(5);
  if (["SP500", "NASDAQ"].includes(market)) return num.toFixed(2);
  if (["OIL", "XAUUSD"].includes(market)) return num.toFixed(2);
  if (["USDJPY", "EURJPY", "GBPJPY", "AUDJPY"].includes(market)) {
    return num.toFixed(3);
  }

  return num.toFixed(5);
}