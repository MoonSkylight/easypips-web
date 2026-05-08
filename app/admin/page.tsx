"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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

type FormState = {
  desk: "DESK_1" | "DESK_2";
  trader_name: string;
  pair: string;
  side: "BUY" | "SELL";
  entry: string;
  stop_loss: string;
  take_profit: string;
  timeframe: string;
  note: string;
};

export default function AdminPage() {
  const [signals, setSignals] = useState<ManualDeskSignal[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState<FormState>({
    desk: "DESK_1",
    trader_name: "Doctor Rano",
    pair: "XAUUSD",
    side: "BUY",
    entry: "",
    stop_loss: "",
    take_profit: "",
    timeframe: "5m",
    note: "",
  });

  async function loadSignals() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/desk-signals`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_ACCESS_TOKEN || ""}`,
        },
      });
      const json = await res.json();
      setSignals(json?.items || []);
    } catch {
      setSignals([]);
      setMessage("Failed to load published desk signals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSignals();
  }, []);

  async function publishSignal() {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/desk-signals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_ACCESS_TOKEN || ""}`,
        },
        body: JSON.stringify({
          desk: form.desk,
          trader_name: form.trader_name,
          pair: form.pair,
          side: form.side,
          entry: Number(form.entry),
          stop_loss: Number(form.stop_loss),
          take_profit: Number(form.take_profit),
          timeframe: form.timeframe,
          note: form.note,
        }),
      });

      if (!res.ok) throw new Error("publish failed");
      await loadSignals();
      setMessage("Signal published successfully.");
    } catch {
      setMessage("Could not publish signal.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSignal(id: string) {
    try {
      const res = await fetch(`${API_URL}/desk-signals/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_ACCESS_TOKEN || ""}`,
        },
      });

      if (!res.ok) throw new Error("delete failed");
      await loadSignals();
      setMessage("Signal removed.");
    } catch {
      setMessage("Could not remove signal.");
    }
  }

  function logout() {
    document.cookie =
      "easypips_admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
    window.location.href = "/admin-login";
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 rounded-[28px] border border-white/10 bg-[#0b1627] px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                EasyPips Admin
              </p>
              <h1 className="mt-2 text-2xl font-bold">
                Desk 1 and Desk 2 Publishing Panel
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Publish manual signals for each desk, then they appear on the public dashboard.
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-[28px] border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(12,23,41,0.96))] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Manual Signal Form
            </p>

            <div className="mt-4 space-y-3">
              <Field label="Desk">
                <select
                  value={form.desk}
                  onChange={(e) => {
                    const desk = e.target.value as "DESK_1" | "DESK_2";
                    setForm((prev) => ({
                      ...prev,
                      desk,
                      trader_name: desk === "DESK_1" ? "Doctor Rano" : "Doctor Fahdi",
                    }));
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3 outline-none"
                >
                  <option value="DESK_1">Desk 1</option>
                  <option value="DESK_2">Desk 2</option>
                </select>
              </Field>

              <Field label="Trader Name">
                <input
                  value={form.trader_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, trader_name: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3 outline-none"
                />
              </Field>

              <Field label="Pair">
                <input
                  value={form.pair}
                  onChange={(e) => setForm((prev) => ({ ...prev, pair: e.target.value.toUpperCase() }))}
                  className="w-full rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3 outline-none"
                />
              </Field>

              <Field label="Side">
                <select
                  value={form.side}
                  onChange={(e) => setForm((prev) => ({ ...prev, side: e.target.value as "BUY" | "SELL" }))}
                  className="w-full rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3 outline-none"
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Entry">
                  <input
                    value={form.entry}
                    onChange={(e) => setForm((prev) => ({ ...prev, entry: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3 outline-none"
                  />
                </Field>

                <Field label="SL">
                  <input
                    value={form.stop_loss}
                    onChange={(e) => setForm((prev) => ({ ...prev, stop_loss: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3 outline-none"
                  />
                </Field>

                <Field label="TP">
                  <input
                    value={form.take_profit}
                    onChange={(e) => setForm((prev) => ({ ...prev, take_profit: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3 outline-none"
                  />
                </Field>
              </div>

              <Field label="Timeframe">
                <input
                  value={form.timeframe}
                  onChange={(e) => setForm((prev) => ({ ...prev, timeframe: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3 outline-none"
                />
              </Field>

              <Field label="Note">
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3 outline-none"
                />
              </Field>

              <button
                onClick={publishSignal}
                disabled={saving}
                className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Publishing..." : "Publish Signal"}
              </button>

              {message ? <p className="text-sm text-slate-300">{message}</p> : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-fuchsia-400/20 bg-[linear-gradient(180deg,rgba(168,85,247,0.10),rgba(12,23,41,0.96))] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Published Desk Signals
            </p>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-4 text-slate-400">
                  Loading...
                </div>
              ) : signals.length ? (
                signals.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-white/10 bg-[#0f1c31] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          {s.desk.replace("_", " ")}
                        </p>
                        <h3 className="mt-1 text-lg font-bold">{s.trader_name}</h3>
                        <p className="mt-1 text-sm text-slate-300">
                          {s.pair} · {s.side} · {s.timeframe}
                        </p>
                      </div>

                      <button
                        onClick={() => removeSignal(s.id)}
                        className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <MiniStat label="Entry" value={String(s.entry)} />
                      <MiniStat label="SL" value={String(s.stop_loss)} tone="red" />
                      <MiniStat label="TP" value={String(s.take_profit)} tone="green" />
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                      {s.note || "No note."}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-4 text-slate-400">
                  No published desk signals yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#091425] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p
        className={`mt-2 text-sm font-bold ${
          tone === "green" ? "text-green-400" : tone === "red" ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}