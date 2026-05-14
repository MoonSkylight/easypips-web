"use client";

import { useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("admin-token");
    if (saved) {
      setToken(saved);
      loadData(saved);
    }
  }, []);

  async function loadData(token: string) {
    try {
      const sig = await fetch(`${API}/admin/signals`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());

      const acc = await fetch(`${API}/client-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());

      setSignals(sig.signals || []);
      setAccounts(acc.accounts || []);
    } catch {
      setMessage("Failed to load admin data");
    }
  }

  async function deleteSignal(id: string) {
    try {
      await fetch(`${API}/admin/signals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setSignals((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setMessage("Delete failed");
    }
  }

  async function approveAccount(id: string) {
    try {
      await fetch(`${API}/admin/accounts/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage("Account approved");
    } catch {
      setMessage("Approval failed");
    }
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070D] text-white">
        Please login to admin first
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070D] text-white p-6">
      <h1 className="text-3xl font-black mb-6">Admin Control Panel</h1>

      {/* SIGNAL MANAGEMENT */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Signal Management</h2>

        <div className="space-y-3">
          {signals.map((s) => (
            <div
              key={s.id}
              className="flex justify-between items-center bg-black/30 p-4 rounded"
            >
              <div>
                <p className="font-bold">
                  {s.symbol} {s.direction}
                </p>
                <p className="text-sm text-slate-400">
                  {s.strategy || s.desk}
                </p>
              </div>

              <button
                onClick={() => deleteSignal(s.id)}
                className="bg-red-400 px-3 py-2 rounded text-black font-bold"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CLIENT ACCOUNTS */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          Client MT4/MT5 Requests
        </h2>

        <div className="space-y-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex justify-between items-center bg-black/30 p-4 rounded"
            >
              <div>
                <p className="font-bold">{acc.name}</p>
                <p className="text-sm text-slate-400">
                  {acc.platform} · {acc.broker}
                </p>
              </div>

              <button
                onClick={() => approveAccount(acc.id)}
                className="bg-green-400 px-3 py-2 rounded text-black font-bold"
              >
                Approve
              </button>
            </div>
          ))}
        </div>
      </section>

      {message && <p className="mt-6 text-yellow-300">{message}</p>}
    </main>
  );
}