"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

type Signal = {
  id?: string;
  source?: string;
  desk?: string;
  symbol?: string;
  direction?: string;
  entry?: string | number;
  sl?: string | number;
  tp1?: string | number;
  tp2?: string | number;
  tp3?: string | number;
  confidence?: string | number;
  status?: string;
  result?: string;
  created_at?: string;
  telegram_sent?: boolean;
  hit_tp1?: boolean;
  hit_tp2?: boolean;
  hit_tp3?: boolean;
  hit_sl?: boolean;
  note?: string;
  analyst?: string;
};

type Account = {
  id?: string;
  name?: string;
  email?: string;
  platform?: string;
  broker?: string;
  account_login?: string;
  status?: string;
};

function getSignals(data: any): Signal[] {
  const rows = [
    ...(data?.aiSignals || []),
    ...(data?.strategyASignals || []),
    ...(data?.strategyBSignals || []),
    ...(data?.strategyCSignals || []),
    ...(data?.desk1Signals || []),
    ...(data?.desk2Signals || []),
  ];

  return rows.filter((s: Signal, index: number, arr: Signal[]) => {
    if (!s?.id) return true;
    return arr.findIndex((x) => x.id === s.id) === index;
  });
}

function formatDate(v?: string) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

export default function AdminPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(false);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: token,
    }),
    [token]
  );

  useEffect(() => {
    const saved = localStorage.getItem("easypips-admin-token") || "";
    setToken(saved);
    loadData();
  }, []);

  function saveToken() {
    localStorage.setItem("easypips-admin-token", token);
    setMessage("Admin token saved.");
  }

  async function loadData() {
    try {
      const [signalRes, accountRes] = await Promise.allSettled([
        fetch(`${API}/all-paid-signals`, { cache: "no-store" }),
        fetch(`${API}/client-accounts`, { cache: "no-store" }),
      ]);

      if (signalRes.status === "fulfilled") {
        const data = await signalRes.value.json();
        setSignals(getSignals(data));
      }

      if (accountRes.status === "fulfilled") {
        const data = await accountRes.value.json();
        setAccounts(data.accounts || data.clientAccounts || []);
      }
    } catch {
      setMessage("Unable to load admin data.");
    }
  }

  async function apiAction(url: string, options: RequestInit = {}) {
    setLoading(true);
    setMessage("Working...");
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setMessage(data.message || data.error || "Action failed.");
        return;
      }

      setMessage(data.message || "Action completed.");
      await loadData();
      setEditing(null);
    } catch {
      setMessage("Action failed.");
    } finally {
      setLoading(false);
    }
  }

  async function updateSignal(id: string, updates: Partial<Signal>) {
    await apiAction(`${API}/admin/signals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  async function removeSignal(id: string) {
    if (!confirm("Remove this signal from dashboard immediately?")) return;
    await apiAction(`${API}/admin/signals/${id}`, { method: "DELETE" });
  }

  async function markSignal(s: Signal, result: "TP1" | "TP2" | "TP3" | "SL") {
    if (!s.id) return;

    const updates: Partial<Signal> = { result };

    if (result === "TP1") {
      updates.hit_tp1 = true;
      updates.hit_sl = false;
      updates.status = "ACTIVE";
    }

    if (result === "TP2") {
      updates.hit_tp1 = true;
      updates.hit_tp2 = true;
      updates.hit_sl = false;
      updates.status = "ACTIVE";
    }

    if (result === "TP3") {
      updates.hit_tp1 = true;
      updates.hit_tp2 = true;
      updates.hit_tp3 = true;
      updates.hit_sl = false;
      updates.status = "CLOSED";
    }

    if (result === "SL") {
      if (s.hit_tp1 || s.hit_tp2 || s.hit_tp3) {
        setMessage("SL ignored because this trade already hit TP1/TP2/TP3.");
        return;
      }
      updates.hit_sl = true;
      updates.status = "CLOSED";
    }

    await updateSignal(s.id, updates);
  }

  async function approveAccount(id?: string) {
    if (!id) return;
    await apiAction(`${API}/admin/client-accounts/${id}/approve`, {
      method: "POST",
    });
  }

  async function rejectAccount(id?: string) {
    if (!id) return;
    await apiAction(`${API}/admin/client-accounts/${id}/reject`, {
      method: "POST",
    });
  }

  const active = signals.filter((s) => s.status === "ACTIVE");
  const closed = signals.filter((s) => s.status === "CLOSED");
  const pendingAccounts = accounts.filter(
    (a) => String(a.status || "").toLowerCase() !== "approved"
  );

  return (
    <main className="min-h-screen bg-[#030811] px-5 py-6 text-white">
      <section className="mx-auto max-w-[1700px]">
        <header className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black">
                Easy<span className="text-yellow-300">Pips</span>{" "}
                <span className="text-emerald-300">Admin Control Center</span>
              </h1>
              <p className="mt-2 text-slate-400">
                Edit signals, remove dashboard signals, mark TP/SL, and approve customer accounts.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/10 px-5 py-3 font-black hover:bg-white/10"
              >
                Dashboard
              </Link>
              <button
                onClick={loadData}
                className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black hover:bg-yellow-300"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste admin token here"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            />
            <button
              onClick={saveToken}
              className="rounded-2xl bg-emerald-400 px-5 py-3 font-black text-black"
            >
              Save Token
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 font-black text-yellow-300">
              {message}
            </div>
          )}
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card title="Total Signals" value={signals.length} />
          <Card title="Active" value={active.length} color="text-emerald-300" />
          <Card title="Closed" value={closed.length} color="text-purple-300" />
          <Card title="Pending Accounts" value={pendingAccounts.length} color="text-yellow-300" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black">Signal Control</h2>
              <p className="text-sm text-slate-400">AI + Trading Room + Human signals</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-black/40 text-slate-400">
                  <tr>
                    {[
                      "Date",
                      "Pair",
                      "Type",
                      "Entry",
                      "SL",
                      "TP1",
                      "TP2",
                      "TP3",
                      "Status",
                      "Result",
                      "Actions",
                    ].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {signals
                    .filter((s) => s.status !== "DELETED")
                    .slice(0, 60)
                    .map((s, i) => (
                      <tr key={s.id || i} className="border-b border-white/5">
                        <td className="p-3 text-slate-400">{formatDate(s.created_at)}</td>
                        <td className="p-3 font-black">{s.symbol}</td>
                        <td
                          className={`p-3 font-black ${
                            String(s.direction).includes("SELL")
                              ? "text-red-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {s.direction}
                        </td>
                        <td className="p-3">{s.entry}</td>
                        <td className="p-3 text-red-300">{s.sl}</td>
                        <td className="p-3 text-emerald-300">{s.tp1}</td>
                        <td className="p-3 text-emerald-300">{s.tp2}</td>
                        <td className="p-3 text-emerald-300">{s.tp3}</td>
                        <td className="p-3">{s.status}</td>
                        <td className="p-3 font-black">{s.result}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => setEditing(s)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black">Edit</button>
                            <button onClick={() => markSignal(s, "TP1")} className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-black">TP1</button>
                            <button onClick={() => markSignal(s, "TP2")} className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-black">TP2</button>
                            <button onClick={() => markSignal(s, "TP3")} className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-black">TP3</button>
                            <button onClick={() => markSignal(s, "SL")} className="rounded-xl bg-red-400 px-3 py-2 text-xs font-black text-black">SL</button>
                            <button onClick={() => s.id && removeSignal(s.id)} className="rounded-xl bg-red-400 px-3 py-2 text-xs font-black text-black">Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
            <h2 className="text-2xl font-black">Customer Account Approvals</h2>

            <div className="mt-5 space-y-3">
              {accounts.length === 0 ? (
                <p className="text-slate-400">No customer requests yet.</p>
              ) : (
                accounts.slice(0, 20).map((a, i) => (
                  <div key={a.id || i} className="rounded-2xl bg-black/30 p-4">
                    <p className="font-black">{a.name || a.email || "Customer"}</p>
                    <p className="text-sm text-slate-400">
                      {a.platform || "MT5"} · {a.broker || "Broker"} · Login:{" "}
                      {a.account_login || "-"}
                    </p>
                    <p className="mt-1 text-sm">
                      Status:{" "}
                      <span className="font-black text-yellow-300">
                        {a.status || "pending"}
                      </span>
                    </p>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => approveAccount(a.id)}
                        className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-black"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectAccount(a.id)}
                        className="rounded-xl bg-red-400 px-3 py-2 text-xs font-black text-black"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link
              href="/admin/requests"
              className="mt-5 block rounded-2xl border border-white/10 px-5 py-3 text-center font-black hover:bg-white/10"
            >
              Open Request Page
            </Link>
          </section>
        </div>

        {editing && (
          <EditModal
            signal={editing}
            loading={loading}
            onClose={() => setEditing(null)}
            onSave={(updates) => editing.id && updateSignal(editing.id, updates)}
          />
        )}
      </section>
    </main>
  );
}

function Card({
  title,
  value,
  color = "text-white",
}: {
  title: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase text-slate-400">{title}</p>
      <p className={`mt-3 text-4xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function EditModal({
  signal,
  loading,
  onClose,
  onSave,
}: {
  signal: Signal;
  loading: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Signal>) => void;
}) {
  const [form, setForm] = useState<Partial<Signal>>({
    symbol: signal.symbol || "",
    direction: signal.direction || "",
    entry: signal.entry || "",
    sl: signal.sl || "",
    tp1: signal.tp1 || "",
    tp2: signal.tp2 || "",
    tp3: signal.tp3 || "",
    status: signal.status || "ACTIVE",
    result: signal.result || "RUNNING",
    note: signal.note || "",
    analyst: signal.analyst || "",
  });

  function update(k: keyof Signal, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#07101b] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-3xl font-black">Edit Signal</h2>
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2">
            Close
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["symbol", "Symbol"],
            ["direction", "Direction"],
            ["entry", "Entry"],
            ["sl", "SL"],
            ["tp1", "TP1"],
            ["tp2", "TP2"],
            ["tp3", "TP3"],
            ["status", "Status"],
            ["result", "Result"],
            ["analyst", "Analyst"],
          ].map(([key, label]) => (
            <input
              key={key}
              value={String((form as any)[key] || "")}
              onChange={(e) => update(key as keyof Signal, e.target.value)}
              placeholder={label}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            />
          ))}

          <textarea
            value={String(form.note || "")}
            onChange={(e) => update("note", e.target.value)}
            placeholder="Note"
            className="min-h-28 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none md:col-span-2"
          />
        </div>

        <button
          disabled={loading}
          onClick={() => onSave(form)}
          className="mt-5 w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black disabled:opacity-60"
        >
          Save Signal Changes
        </button>
      </div>
    </div>
  );
}
