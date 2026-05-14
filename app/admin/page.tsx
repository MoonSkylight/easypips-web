"use client";

import { useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

type Desk = "Desk 1" | "Desk 2";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const [desk, setDesk] = useState<Desk>("Desk 1");
  const [signals, setSignals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const [form, setForm] = useState({
    symbol: "XAU/USD",
    direction: "BUY",
    entry: "",
    sl: "",
    tp1: "",
    tp2: "",
    tp3: "",
    analyst: "EasyPips Analyst",
    note: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("admin-token");
    if (saved) {
      setToken(saved);
      loadData(saved);
    }
    setChecking(false);
  }, []);

  async function login() {
    setMessage("Logging in...");

    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.access_token) {
        setMessage(data.detail || "Login failed");
        return;
      }

      localStorage.setItem("admin-token", data.access_token);
      setToken(data.access_token);
      setMessage("");
      loadData(data.access_token);
    } catch {
      setMessage("Backend connection failed");
    }
  }

  async function loadData(activeToken = token) {
    if (!activeToken) return;

    try {
      const sigRes = await fetch(`${API}/admin/signals`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      const accRes = await fetch(`${API}/client-accounts`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      const sigData = await sigRes.json();
      const accData = await accRes.json();

      setSignals(sigData.signals || []);
      setAccounts(accData.accounts || []);
    } catch {
      setMessage("Failed to load admin data");
    }
  }

  async function publish() {
    setMessage("Publishing signal...");

    if (!token) {
      setMessage("Missing admin token.");
      return;
    }

    const endpoint =
      desk === "Desk 1" ? `${API}/desk1/signals` : `${API}/desk2/signals`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setMessage(data.detail || data.message || "Publish failed");
        return;
      }

      setMessage(`Signal published to ${desk} ✅`);

      setForm({
        symbol: "XAU/USD",
        direction: "BUY",
        entry: "",
        sl: "",
        tp1: "",
        tp2: "",
        tp3: "",
        analyst: "EasyPips Analyst",
        note: "",
      });

      loadData(token);
    } catch {
      setMessage("Error sending signal");
    }
  }

  async function deleteSignal(id: string) {
    if (!token) return;

    const ok = confirm("Delete this signal?");
    if (!ok) return;

    try {
      await fetch(`${API}/admin/signals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setSignals((prev) => prev.filter((s) => s.id !== id));
      setMessage("Signal deleted ✅");
    } catch {
      setMessage("Delete failed");
    }
  }

  async function updateSignal() {
    if (!token || !editing) return;

    try {
      const res = await fetch(`${API}/admin/signals/${editing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: editing.symbol,
          direction: editing.direction,
          entry: editing.entry,
          sl: editing.sl,
          tp1: editing.tp1,
          tp2: editing.tp2,
          tp3: editing.tp3,
          status: editing.status,
          result: editing.result,
          note: editing.note,
          analyst: editing.analyst,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setMessage(data.detail || data.message || "Update failed");
        return;
      }

      setEditing(null);
      setMessage("Signal updated ✅");
      loadData(token);
    } catch {
      setMessage("Update failed");
    }
  }

  async function approveAccount(id: string) {
    if (!token) return;

    try {
      await fetch(`${API}/admin/accounts/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage("Account approved ✅");
      loadData(token);
    } catch {
      setMessage("Approval failed");
    }
  }

  function logout() {
    localStorage.removeItem("admin-token");
    setToken(null);
    setMessage("");
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070D] text-white">
        Loading admin...
      </main>
    );
  }

  if (!token) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#05070D] px-6 py-10 text-white">
        <div className="absolute left-[-120px] top-[-120px] h-96 w-96 rounded-full bg-yellow-400/20 blur-[120px]" />
        <div className="absolute right-[-120px] bottom-[-120px] h-96 w-96 rounded-full bg-emerald-400/20 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[130px]" />

        <div className="relative mx-auto grid min-h-screen max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <section>
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black shadow-lg shadow-yellow-400/30">
                EP
              </div>
              <div>
                <h1 className="text-2xl font-black">
                  EasyPips <span className="text-yellow-300">Admin</span>
                </h1>
                <p className="text-sm text-slate-400">
                  Secure trading desk command center
                </p>
              </div>
            </div>

            <p className="mb-4 inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-yellow-300">
              Signal Operations
            </p>

            <h2 className="max-w-xl text-6xl font-black leading-tight">
              Control signals,
              <br />
              clients, and
              <br />
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-emerald-400 bg-clip-text text-transparent">
                desk publishing.
              </span>
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              Publish Desk 1 and Desk 2 signals, manage AI/manual trades, approve
              MT4/MT5 clients, and keep Telegram alerts live.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Feature title="Desk Signals" value="LIVE" tone="yellow" />
              <Feature title="Telegram" value="ON" tone="green" />
              <Feature title="Controls" value="ADMIN" tone="blue" />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <p className="mb-3 inline-flex rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-black">
                SECURE LOGIN
              </p>
              <h3 className="text-3xl font-black">Admin Login</h3>
              <p className="mt-2 text-sm text-slate-400">
                Access publishing, signal management, and client approvals.
              </p>
            </div>

            <div className="space-y-4">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-slate-500 focus:border-yellow-400/50"
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-slate-500 focus:border-yellow-400/50"
              />

              <button
                onClick={login}
                className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black shadow-lg shadow-yellow-400/20 hover:bg-yellow-300"
              >
                Login to Control Panel
              </button>

              {message && <MessageBox message={message} />}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070D] text-white">
      <header className="border-b border-white/10 bg-[#080C14] px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black">
              EP
            </div>
            <div>
              <h1 className="text-xl font-black">Admin Control Panel</h1>
              <p className="text-xs text-slate-400">
                Publish, edit, delete signals and approve clients
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => loadData(token)}
              className="rounded-2xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10"
            >
              Refresh
            </button>

            <button
              onClick={logout}
              className="rounded-2xl bg-red-400 px-5 py-3 font-black text-black"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 p-6 xl:grid-cols-[0.8fr_1.2fr]">
        <aside className="space-y-6">
          <Panel title="Publish Desk Signal">
            <div className="grid grid-cols-2 gap-3">
              {(["Desk 1", "Desk 2"] as Desk[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setDesk(item)}
                  className={`rounded-2xl px-5 py-5 font-black ${
                    desk === item
                      ? "bg-yellow-400 text-black"
                      : "border border-white/10 bg-black/30 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              <Field label="Symbol" value={form.symbol} onChange={(v) => setForm({ ...form, symbol: v })} placeholder="XAU/USD" />

              <label className="grid gap-2">
                <span className="text-sm text-slate-400">Direction</span>
                <select
                  value={form.direction}
                  onChange={(e) => setForm({ ...form, direction: e.target.value })}
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                >
                  <option className="bg-[#05070D]" value="BUY">BUY</option>
                  <option className="bg-[#05070D]" value="SELL">SELL</option>
                  <option className="bg-[#05070D]" value="BUY LIMIT">BUY LIMIT</option>
                  <option className="bg-[#05070D]" value="SELL LIMIT">SELL LIMIT</option>
                </select>
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Entry" value={form.entry} onChange={(v) => setForm({ ...form, entry: v })} placeholder="4690" />
                <Field label="SL" value={form.sl} onChange={(v) => setForm({ ...form, sl: v })} placeholder="4700" />
                <Field label="TP1" value={form.tp1} onChange={(v) => setForm({ ...form, tp1: v })} placeholder="4660" />
                <Field label="TP2" value={form.tp2} onChange={(v) => setForm({ ...form, tp2: v })} placeholder="4650" />
                <Field label="TP3" value={form.tp3} onChange={(v) => setForm({ ...form, tp3: v })} placeholder="4640" />
                <Field label="Analyst" value={form.analyst} onChange={(v) => setForm({ ...form, analyst: v })} placeholder="EasyPips Analyst" />
              </div>

              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Optional note"
                className="min-h-24 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
              />

              <button
                onClick={publish}
                className="rounded-2xl bg-emerald-400 px-5 py-4 font-black text-black"
              >
                Publish Signal to {desk}
              </button>
            </div>
          </Panel>

          <Panel title="Client MT4/MT5 Requests">
            {accounts.length === 0 ? (
              <p className="text-slate-400">No client requests found.</p>
            ) : (
              <div className="space-y-3">
                {accounts.map((acc) => (
                  <div key={acc.id} className="rounded-2xl bg-black/30 p-4">
                    <p className="font-black">{acc.name || "Client"}</p>
                    <p className="text-sm text-slate-400">
                      {acc.platform} · {acc.broker} · {acc.account_login}
                    </p>
                    <p className="mt-1 text-xs text-yellow-300">
                      Status: {acc.status || "pending"} · Risk:{" "}
                      {acc.risk_mode || "manual"} · Max Lot:{" "}
                      {acc.max_lot || "0.01"}
                    </p>

                    <button
                      onClick={() => approveAccount(acc.id)}
                      className="mt-3 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-black text-black"
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </aside>

        <section className="space-y-6">
          <Panel title="Signal Management">
            {signals.length === 0 ? (
              <p className="text-slate-400">No signals found.</p>
            ) : (
              <div className="space-y-3">
                {signals.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl bg-black/30 p-4 md:flex-row md:items-center"
                  >
                    <div>
                      <p className="font-black">
                        {s.symbol} {s.direction}
                      </p>
                      <p className="text-sm text-slate-400">
                        {s.strategy || s.desk || s.source} · {s.status} ·{" "}
                        {s.result}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Entry {s.entry} · SL {s.sl} · TP1 {s.tp1} · TP2 {s.tp2} ·
                        TP3 {s.tp3}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(s)}
                        className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteSignal(s.id)}
                        className="rounded-xl bg-red-400 px-4 py-2 text-sm font-black text-black"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {message && <MessageBox message={message} />}
        </section>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0A101C] p-6 shadow-2xl">
            <h2 className="text-2xl font-black">Edit Signal</h2>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {["symbol", "direction", "entry", "sl", "tp1", "tp2", "tp3", "status", "result"].map((field) => (
                <input
                  key={field}
                  value={editing[field] || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, [field]: e.target.value })
                  }
                  placeholder={field}
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                />
              ))}
            </div>

            <textarea
              value={editing.note || ""}
              onChange={(e) => setEditing({ ...editing, note: e.target.value })}
              placeholder="note"
              className="mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
            />

            <div className="mt-5 flex gap-3">
              <button
                onClick={updateSignal}
                className="rounded-2xl bg-emerald-400 px-5 py-3 font-black text-black"
              >
                Save Changes
              </button>

              <button
                onClick={() => setEditing(null)}
                className="rounded-2xl border border-white/10 px-5 py-3 font-black text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Feature({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "yellow" | "green" | "blue";
}) {
  const color =
    tone === "yellow"
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
      : tone === "green"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : "border-blue-400/20 bg-blue-400/10 text-blue-300";

  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-xs font-black uppercase tracking-widest">{value}</p>
      <p className="mt-1 text-sm font-bold text-white">{title}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
      <h2 className="mb-4 text-lg font-black">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
      />
    </label>
  );
}

function MessageBox({ message }: { message: string }) {
  const good =
    message.toLowerCase().includes("success") ||
    message.includes("✅") ||
    message.toLowerCase().includes("published") ||
    message.toLowerCase().includes("approved") ||
    message.toLowerCase().includes("updated") ||
    message.toLowerCase().includes("deleted");

  return (
    <p
      className={`rounded-xl p-3 text-center text-sm font-bold ${
        good
          ? "bg-emerald-400/10 text-emerald-300"
          : "bg-yellow-400/10 text-yellow-300"
      }`}
    >
      {message}
    </p>
  );
}