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
    if (saved) setToken(saved);
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
    } catch {
      setMessage("Backend connection failed");
    }
  }

  async function publish() {
    setMessage("Publishing signal...");

    if (!token) {
      setMessage("Missing admin token. Please login again.");
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
    } catch {
      setMessage("Error sending signal");
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
      <main className="min-h-screen bg-[#05070D] px-6 py-10 text-white">
        <div className="mx-auto grid min-h-screen max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <section>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black">
                EP
              </div>
              <div>
                <h1 className="text-2xl font-black">
                  EasyPips <span className="text-yellow-300">Admin</span>
                </h1>
                <p className="text-sm text-slate-400">
                  Desk 1 / Desk 2 publishing control
                </p>
              </div>
            </div>

            <h2 className="text-5xl font-black leading-tight">
              Publish human signals with premium control.
            </h2>

            <p className="mt-5 max-w-xl text-slate-300">
              Login to send Desk 1 and Desk 2 signals directly to the dashboard
              and Telegram feed.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Feature title="Desk Signals" />
              <Feature title="Telegram Alerts" />
              <Feature title="Live Dashboard" />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
            <p className="mb-3 inline-flex rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-black">
              SECURE ADMIN
            </p>

            <h3 className="text-2xl font-black">Admin Login</h3>
            <p className="mt-2 text-sm text-slate-400">
              Enter admin credentials to access publishing.
            </p>

            <div className="mt-6 space-y-3">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />

              <button
                onClick={login}
                className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black shadow-lg shadow-yellow-400/20 hover:bg-yellow-300"
              >
                Login
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
              <h1 className="text-xl font-black">Admin Desk Publish</h1>
              <p className="text-xs text-slate-400">
                Publish manual signals to Desk 1 or Desk 2
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl bg-red-400 px-5 py-3 font-black text-black hover:bg-red-300"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 p-6 xl:grid-cols-[0.75fr_1.25fr]">
        <aside className="space-y-6">
          <Panel title="Select Desk">
            <div className="grid grid-cols-2 gap-3">
              {(["Desk 1", "Desk 2"] as Desk[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setDesk(item)}
                  className={`rounded-2xl px-5 py-5 font-black transition ${
                    desk === item
                      ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20"
                      : "border border-white/10 bg-black/30 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Signal Preview">
            <div className="rounded-3xl border border-white/10 bg-[#0A101C] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400">{desk}</p>
                  <h3 className="mt-1 text-2xl font-black">
                    {form.symbol || "-"}
                  </h3>
                </div>

                <span
                  className={`rounded-xl px-3 py-1 text-xs font-black ${
                    form.direction === "BUY"
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-red-400/10 text-red-300"
                  }`}
                >
                  {form.direction}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Box label="Entry" value={form.entry || "-"} />
                <Box label="SL" value={form.sl || "-"} red />
                <Box label="TP1" value={form.tp1 || "-"} green />
                <Box label="TP2" value={form.tp2 || "-"} green />
                <Box label="TP3" value={form.tp3 || "-"} green />
                <Box label="Analyst" value={form.analyst || "-"} />
              </div>
            </div>
          </Panel>

          <Panel title="Publish Flow">
            <div className="space-y-3 text-sm">
              <Info title="1. Backend Save" text="Signal is saved in database." />
              <Info title="2. Dashboard Live" text="Signal appears on dashboard." />
              <Info title="3. Telegram Alert" text="Telegram receives alert." />
            </div>
          </Panel>
        </aside>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
          <div className="mb-6">
            <p className="text-sm font-black uppercase tracking-widest text-yellow-300">
              {desk}
            </p>
            <h2 className="mt-2 text-3xl font-black">Publish Human Signal</h2>
            <p className="mt-2 text-slate-400">
              Fill the trade details and publish to the selected desk.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Symbol"
                value={form.symbol}
                onChange={(v) => setForm({ ...form, symbol: v })}
                placeholder="XAU/USD"
              />

              <label className="grid gap-2">
                <span className="text-sm text-slate-400">Direction</span>
                <select
                  value={form.direction}
                  onChange={(e) =>
                    setForm({ ...form, direction: e.target.value })
                  }
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                >
                  <option className="bg-[#05070D]" value="BUY">
                    BUY
                  </option>
                  <option className="bg-[#05070D]" value="SELL">
                    SELL
                  </option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Entry" value={form.entry} onChange={(v) => setForm({ ...form, entry: v })} placeholder="4690" />
              <Field label="Stop Loss" value={form.sl} onChange={(v) => setForm({ ...form, sl: v })} placeholder="4700" />
              <Field label="TP1" value={form.tp1} onChange={(v) => setForm({ ...form, tp1: v })} placeholder="4660" />
              <Field label="TP2" value={form.tp2} onChange={(v) => setForm({ ...form, tp2: v })} placeholder="4650" />
              <Field label="TP3" value={form.tp3} onChange={(v) => setForm({ ...form, tp3: v })} placeholder="4640" />
              <Field label="Analyst" value={form.analyst} onChange={(v) => setForm({ ...form, analyst: v })} placeholder="EasyPips Analyst" />
            </div>

            <label className="grid gap-2">
              <span className="text-sm text-slate-400">Trade Note</span>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Optional market context"
                className="min-h-28 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </label>

            <button
              onClick={publish}
              className="mt-2 rounded-2xl bg-emerald-400 px-5 py-4 font-black text-black shadow-lg shadow-emerald-400/20 hover:bg-emerald-300"
            >
              Publish Signal to {desk}
            </button>

            {message && <MessageBox message={message} />}
          </div>
        </section>
      </section>
    </main>
  );
}

function Feature({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm font-black text-yellow-300">
      {title}
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
        className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-slate-500"
      />
    </label>
  );
}

function Box({
  label,
  value,
  green,
  red,
}: {
  label: string;
  value: string;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-black/35 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-1 break-words font-mono text-lg font-black ${
          green ? "text-emerald-400" : red ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Info({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="font-black text-yellow-300">{title}</p>
      <p className="mt-1 text-slate-400">{text}</p>
    </div>
  );
}

function MessageBox({ message }: { message: string }) {
  const good =
    message.toLowerCase().includes("success") ||
    message.includes("✅") ||
    message.toLowerCase().includes("published");

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