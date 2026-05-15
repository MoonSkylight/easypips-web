"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

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

export default function AdminRequestsPage() {
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);

  async function loadAccounts() {
    try {
      const res = await fetch(`${API}/client-accounts`, { cache: "no-store" });
      const data = await res.json();
      setAccounts(data.accounts || data.clientAccounts || []);
    } catch {
      setAccounts([]);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  return (
    <main className="min-h-screen bg-[#030811] p-5 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div>
            <h1 className="text-3xl font-black">MT4 / MT5 Connection Requests</h1>
            <p className="text-slate-400">Review client account connection requests.</p>
          </div>

          <Link
            href="/admin"
            className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black"
          >
            Back Admin
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          {accounts.length === 0 ? (
            <p className="text-slate-400">No connection requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-black/30 text-slate-400">
                  <tr>
                    {["Created", "Name", "Email", "Platform", "Broker", "Login", "Status"].map(
                      (h) => (
                        <th key={h} className="p-3">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {accounts.map((a, i) => (
                    <tr key={a.id || i} className="border-b border-white/5">
                      <td className="p-3">{a.created_at || "-"}</td>
                      <td className="p-3 font-black">{a.name || "-"}</td>
                      <td className="p-3">{a.email || "-"}</td>
                      <td className="p-3">{a.platform || "MT5"}</td>
                      <td className="p-3">{a.broker || "-"}</td>
                      <td className="p-3">{a.account_login || "-"}</td>
                      <td className="p-3">
                        <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-300">
                          {a.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
