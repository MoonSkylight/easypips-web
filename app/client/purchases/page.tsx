"use client";

import { useEffect, useMemo, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://easypips-api.onrender.com";

type Purchase = {
  purchase_id?: string;
  signal_id?: string;
  pair_name?: string;
  symbol?: string;
  direction?: string;
  strategy?: string;
  timeframe?: string;
  confidence?: number;
  coin_cost?: number;
  unlocked_at?: string;
  result?: string;
  status?: string;
  hit_tp1?: boolean;
  hit_tp2?: boolean;
  hit_tp3?: boolean;
  hit_sl?: boolean;
};

export default function PurchasesPage() {
  const [rows, setRows] = useState<Purchase[]>([]);
  const [message, setMessage] = useState("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("easypips_client_token")
      : null;

  async function loadHistory() {
    if (!token) {
      setMessage("Please login first.");
      return;
    }

    const res = await fetch(`${API}/client/purchase-history`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (data.success) {
      setRows(data.history || []);
    } else {
      setMessage("Unable to load purchases.");
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      coins: rows.reduce(
        (sum, r) => sum + Number(r.coin_cost || 0),
        0
      ),
    };
  }, [rows]);

  return (
    <main className="min-h-screen bg-[#030811] p-4 text-white">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-2xl border border-yellow-300/20 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
            Premium Signals
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Purchase History
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Every premium signal you unlocked with EasyPips Coins.
          </p>

          {message && (
            <div className="mt-3 rounded-xl border border-yellow-300/20 bg-yellow-400/10 px-3 py-2 text-sm font-black text-yellow-300">
              {message}
            </div>
          )}
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <StatCard
            title="Signals Purchased"
            value={stats.total}
          />
          <StatCard
            title="Coins Spent"
            value={stats.coins}
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="space-y-3">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-slate-400">
                No premium purchases yet.
              </div>
            ) : (
              rows.map((p, i) => (
                <div
                  key={p.purchase_id || i}
                  className="rounded-xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-white">
                        {p.pair_name || p.symbol || "Signal"}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {p.direction} • {p.strategy} • {p.timeframe}
                      </p>
                    </div>

                    <div className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-300">
                      {p.coin_cost || 0} Coin
                      {Number(p.coin_cost || 0) !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-4">
                    <Info
                      label="Confidence"
                      value={p.confidence ?? "-"}
                    />
                    <Info
                      label="Status"
                      value={p.status || "-"}
                    />
                    <Info
                      label="Result"
                      value={p.result || "-"}
                    />
                    <Info
                      label="Unlocked"
                      value={p.unlocked_at || "-"}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.hit_tp1 && (
                      <Badge text="TP1 HIT" color="emerald" />
                    )}

                    {p.hit_tp2 && (
                      <Badge text="TP2 HIT" color="emerald" />
                    )}

                    {p.hit_tp3 && (
                      <Badge text="TP3 HIT" color="emerald" />
                    )}

                    {p.hit_sl && (
                      <Badge text="SL HIT" color="red" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-2">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">
        {String(value)}
      </p>
    </div>
  );
}

function Badge({
  text,
  color,
}: {
  text: string;
  color: "emerald" | "red";
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        color === "emerald"
          ? "bg-emerald-400/10 text-emerald-300"
          : "bg-red-400/10 text-red-300"
      }`}
    >
      {text}
    </span>
  );
}