"use client";

import { useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [desk, setDesk] = useState<"desk1" | "desk2">("desk1");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    symbol: "EUR/USD",
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
    const auth = localStorage.getItem("admin-auth");

    if (auth === "true") {
      setAuthorized(true);
    } else {
      window.location.href = "/admin-login";
    }
  }, []);

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submitSignal(e: React.FormEvent) {
    e.preventDefault();

    const endpoint =
      desk === "desk1"
        ? `${API_BASE}/desk1/signals`
        : `${API_BASE}/desk2/signals`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setMessage("Signal Published ✅");
    } else {
      setMessage("Failed ❌");
    }
  }

  function logout() {
    localStorage.removeItem("admin-auth");
    window.location.href = "/admin-login";
  }

  if (!authorized) return null;

  return (
    <main className="min-h-screen bg-[#05070d] p-6 text-white">
      <div className="max-w-3xl mx-auto bg-slate-900 p-6 rounded-3xl border border-white/10">
        <div className="flex justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <button onClick={logout} className="text-red-400">
            Logout
          </button>
        </div>

        <form onSubmit={submitSignal} className="grid gap-4">

          <select
            value={desk}
            onChange={(e) => setDesk(e.target.value as any)}
            className="p-3 bg-black border border-white/10 rounded-xl"
          >
            <option value="desk1">Desk 1</option>
            <option value="desk2">Desk 2</option>
          </select>

          <input
            placeholder="Pair (EUR/USD)"
            value={form.symbol}
            onChange={(e) => updateField("symbol", e.target.value)}
            className="p-3 bg-black border border-white/10 rounded-xl"
          />

          <select
            value={form.direction}
            onChange={(e) => updateField("direction", e.target.value)}
            className="p-3 bg-black border border-white/10 rounded-xl"
          >
            <option>BUY</option>
            <option>SELL</option>
          </select>

          <input placeholder="Entry" onChange={(e) => updateField("entry", e.target.value)} className="p-3 bg-black rounded-xl"/>
          <input placeholder="SL" onChange={(e) => updateField("sl", e.target.value)} className="p-3 bg-black rounded-xl"/>
          <input placeholder="TP1" onChange={(e) => updateField("tp1", e.target.value)} className="p-3 bg-black rounded-xl"/>
          <input placeholder="TP2" onChange={(e) => updateField("tp2", e.target.value)} className="p-3 bg-black rounded-xl"/>
          <input placeholder="TP3" onChange={(e) => updateField("tp3", e.target.value)} className="p-3 bg-black rounded-xl"/>

          <button className="bg-emerald-400 text-black p-3 rounded-xl font-bold">
            Publish Signal
          </button>

          {message && <p>{message}</p>}
        </form>
      </div>
    </main>
  );
}