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
  strategy?: string;
  pattern?: string;
  telegram_sent?: boolean;
};

type ClientAccount = {
  id?: string;
  name?: string;
  email?: string;
  platform?: string;
  broker?: string;
  account_login?: string;
  status?: string;
  created_at?: string;
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
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
      <p className="text-xs font-black uppercase text-slate-400">{title}</p>
      <p className={`mt-3 text-4xl font-black ${color}`}>{value}</p>
      <div className="mt-4 h-2 rounded-full bg-black/40">
        <div className="h-2 w-1/2 rounded-full bg-yellow-400" />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function AdminPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAdminData() {
    try {
      const [signalsRes, accountsRes, statusRes] = await Promise.allSettled([
        fetch(`${API}/all-paid-signals`, { cache: "no-store" }),
        fetch(`${API}/client-accounts`, { cache: "no-store" }),
        fetch(`${API}/system-status`, { cache: "no-store" }),
      ]);

      if (signalsRes.status === "fulfilled") {
        const data = await signalsRes.value.json();
        setSignals(getSignals(data));
      }

      if (accountsRes.status === "fulfilled") {
        const data = await accountsRes.value.json();
        setAccounts(data.accounts || data.clientAccounts || []);
      }

      if (statusRes.status === "fulfilled") {
        const data = await statusRes.value.json();
        setStatus(data);
      }
    } catch (e) {
      setMessage("Unable to load admin data.");
    }
  }

  useEffect(() => {
    loadAdminData();
    const timer = setInterval(loadAdminData, 30000);
    return () => clearInterval(timer);
  }, []);

  async function runCron() {
    setLoading(true);
    setMessage("Running strategy check...");
    try {
      const res = await fetch(`${API}/cron-check`);
      const data = await res.json();
      setMessage(data.message || "Cron check completed.");
      await loadAdminData();
    } catch {
      setMessage("Cron check failed.");
    } finally {
      setLoading(false);
    }
  }

  async function testTelegram() {
    setLoading(true);
    setMessage("Testing Telegram...");
    try {
      const res = await fetch(`${API}/debug-telegram`);
      const data = await res.json();
      setMessage(data.message || "Telegram test attempted.");
    } catch {
      setMessage("Telegram test failed.");
    } finally {
      setLoading(false);
    }
  }

  async function resendTelegram() {
    setLoading(true);
    setMessage("Resending unsent Telegram signals...");
    try {
      const res = await fetch(`${API}/admin/resend-unsent-telegram`);
      const data = await res.json();
      setMessage(
        data.success
          ? `Resent ${data.sent || 0}, failed ${data.failed || 0}.`
          : data.message || "Resend failed."
      );
      await loadAdminData();
    } catch {
      setMessage("Resend failed.");
    } finally {
      setLoading(false);
    }
  }

  const active = signals.filter((s) => (s.status || "").toUpperCase() === "ACTIVE");
  const closed = signals.filter((s) => (s.status || "").toUpperCase() === "CLOSED");
  const strategyA = active.filter((s) => s.strategy === "Strategy A");
  const strategyB = active.filter((s) => s.strategy === "Strategy B");
  const strategyC = active.filter((s) => s.strategy === "Strategy C");
  const helpDesk = active.filter((s) => s.desk === "Desk 1" || s.desk === "Help Desk");
  const unsent = signals.filter((s) => s.telegram_sent === false);

  return (
    <main className="min-h-screen bg-[#030811] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-160px] top-[-160px] h-[420px] w-[420px] rounded-full bg-yellow-400/10 blur-[120px]" />
        <div className="absolute right-[-180px] top-[120px] h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-[140px]" />
      </div>

      <section className="relative mx-auto max-w-[1600px] px-5 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-emerald-300 text-xl font-black text-black">
              EP
            </div>
            <div>
              <h1 className="text-3xl font-black">
                Easy<span className="text-yellow-300">Pips</span>{" "}
                <span className="text-emerald-300">AI</span> Admin
              </h1>
              <p className="text-sm text-slate-400">
                Signal engine, Telegram, client accounts and platform control.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-2xl border border-white/10 px-5 py-3 font-black hover:bg-white/10"
            >
              Dashboard
            </Link>
            <button
              onClick={runCron}
              disabled={loading}
              className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black hover:bg-yellow-300 disabled:opacity-60"
            >
              Run Cron
            </button>
            <button
              onClick={testTelegram}
              disabled={loading}
              className="rounded-2xl bg-emerald-400 px-5 py-3 font-black text-black hover:bg-emerald-300 disabled:opacity-60"
            >
              Test Telegram
            </button>
          </div>
        </header>

        {message && (
          <div className="mb-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-4 font-black text-yellow-300">
            {message}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-7">
          <Card title="Total Signals" value={signals.length} color="text-cyan-300" />
          <Card title="Active" value={active.length} color="text-emerald-300" />
          <Card title="Closed" value={closed.length} color="text-purple-300" />
          <Card title="Strategy A" value={strategyA.length} color="text-blue-300" />
          <Card title="Strategy B" value={strategyB.length} color="text-pink-300" />
          <Card title="Strategy C" value={strategyC.length} color="text-yellow-300" />
          <Card title="Help Desk" value={helpDesk.length} color="text-emerald-300" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Section
            title="Active Signals"
            right={
              <button
                onClick={resendTelegram}
                disabled={loading}
                className="rounded-2xl border border-yellow-400/30 px-4 py-2 text-sm font-black text-yellow-300 hover:bg-yellow-400/10"
              >
                Resend Unsent ({unsent.length})
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-black/30 text-slate-400">
                  <tr>
                    {[
                      "Created",
                      "Pair",
                      "Direction",
                      "Strategy",
                      "Entry",
                      "SL",
                      "TP1",
                      "Result",
                      "Telegram",
                    ].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {active.slice(0, 30).map((s, i) => (
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
                      <td className="p-3">{s.strategy || s.desk || "-"}</td>
                      <td className="p-3">{s.entry}</td>
                      <td className="p-3 text-red-300">{s.sl}</td>
                      <td className="p-3 text-emerald-300">{s.tp1}</td>
                      <td className="p-3">{s.result || "RUNNING"}</td>
                      <td className="p-3">
                        {s.telegram_sent ? (
                          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                            Sent
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-black text-red-300">
                            Not Sent
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="space-y-5">
            <Section title="System Status">
              <div className="space-y-3 text-sm">
                <Row label="API" value={status?.status || "running"} />
                <Row label="Database" value={status?.database || "connected"} />
                <Row label="Telegram" value={status?.telegram || "connected"} />
                <Row label="Active Signals" value={status?.activeSignals ?? active.length} />
                <Row label="Closed Signals" value={status?.closedSignals ?? closed.length} />
                <Row label="Server UTC" value={status?.serverTimeUTC || "-"} />
              </div>
            </Section>

            <Section title="MT4 / MT5 Requests">
              {accounts.length === 0 ? (
                <p className="text-slate-400">No connection requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {accounts.slice(0, 10).map((a, i) => (
                    <div key={a.id || i} className="rounded-2xl bg-black/30 p-4">
                      <p className="font-black">{a.name || a.email || "Client"}</p>
                      <p className="text-sm text-slate-400">
                        {a.platform || "MT5"} · {a.broker || "Broker"} ·{" "}
                        {a.status || "Pending"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href="/admin/requests"
                className="mt-4 inline-block rounded-2xl bg-white/10 px-4 py-3 text-sm font-black hover:bg-white/15"
              >
                Open Requests
              </Link>
            </Section>
          </div>
        </div>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3">
      <span className="text-slate-400">{label}</span>
      <span className="font-black text-emerald-300">{value}</span>
    </div>
  );
}
