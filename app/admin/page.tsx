"use client";

import { useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function AdminPage() {
  const [desk, setDesk] = useState("desk1");
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

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submitSignal(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Sending signal...");

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
      setMessage(`Signal added to ${desk === "desk1" ? "Desk 1" : "Desk 2"} ✅`);
      setForm({
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
    } else {
      setMessage("Failed to add signal ❌");
    }
  }

  return (
    <main className="min-h-screen bg-[#05070d] px-5 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-6">
          <p className="mb-2 inline-flex rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold text-black">
            EASY PIPS ADMIN
          </p>
          <h1 className="text-3xl font-black">Add Human Signal</h1>
          <p className="mt-2 text-slate-400">
            Add manual signals to Desk 1 or Desk 2.
          </p>
        </div>

        <form onSubmit={submitSignal} className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm text-slate-400">Desk</span>
            <select
              value={desk}
              onChange={(e) => setDesk(e.target.value)}
              className="rounded-xl border border-white/10 bg-black p-3"
            >
              <option value="desk1">Desk 1</option>
              <option value="desk2">Desk 2</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-slate-400">Pair / Symbol</span>
            <input
              value={form.symbol}
              onChange={(e) => updateField("symbol", e.target.value)}
              placeholder="EUR/USD"
              className="rounded-xl border border-white/10 bg-black p-3"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-slate-400">Direction</span>
            <select
              value={form.direction}
              onChange={(e) => updateField("direction", e.target.value)}
              className="rounded-xl border border-white/10 bg-black p-3"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <PriceInput label="Entry" name="entry" value={form.entry} updateField={updateField} />
            <PriceInput label="Stop Loss" name="sl" value={form.sl} updateField={updateField} />
            <PriceInput label="TP1" name="tp1" value={form.tp1} updateField={updateField} />
            <PriceInput label="TP2" name="tp2" value={form.tp2} updateField={updateField} />
            <PriceInput label="TP3" name="tp3" value={form.tp3} updateField={updateField} />
          </div>

          <label className="grid gap-2">
            <span className="text-sm text-slate-400">Analyst</span>
            <input
              value={form.analyst}
              onChange={(e) => updateField("analyst", e.target.value)}
              className="rounded-xl border border-white/10 bg-black p-3"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-slate-400">Note</span>
            <textarea
              value={form.note}
              onChange={(e) => updateField("note", e.target.value)}
              className="min-h-24 rounded-xl border border-white/10 bg-black p-3"
            />
          </label>

          <button
            type="submit"
            className="mt-4 rounded-xl bg-emerald-400 px-5 py-4 font-black text-black hover:bg-emerald-300"
          >
            Publish Signal
          </button>

          {message && (
            <p className="rounded-xl bg-white/10 p-3 text-center text-sm">
              {message}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}

function PriceInput({
  label,
  name,
  value,
  updateField,
}: {
  label: string;
  name: string;
  value: string;
  updateField: (name: string, value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => updateField(name, e.target.value)}
        placeholder="1.08200"
        inputMode="decimal"
        className="rounded-xl border border-white/10 bg-black p-3"
        required
      />
    </label>
  );
}