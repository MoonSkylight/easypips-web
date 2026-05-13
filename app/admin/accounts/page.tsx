"use client";

import { useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function AdminAccountsPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  async function login() {
    setMessage("Logging in...");

    const res = await fetch(`${API}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!data.access_token) {
      setMessage("Login failed");
      return;
    }

    setToken(data.access_token);
    setMessage("Login success");
    loadAccounts(data.access_token);
  }

  async function loadAccounts(authToken = token) {
    const res = await fetch(`${API}/admin/client-accounts`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await res.json();
    setAccounts(data.accounts || []);
  }

  async function action(id: string, type: "approve" | "reject" | "toggle-auto-trade") {
    setMessage("Updating...");

    const res = await fetch(`${API}/admin/client-accounts/${id}/${type}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (data.success) {
      setMessage("Updated successfully");
      loadAccounts();
    } else {
      setMessage(data.message || "Update failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#05070D] p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-black">Admin Client Accounts</h1>
        <p className="mt-2 text-slate-400">
          Approve MT4/MT5 accounts and control auto-trading.
        </p>

        {!token && (
          <div className="mt-8 max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="mb-5 text-xl font-black">Admin Login</h2>

            <input
              className="mb-3 w-full rounded-xl bg-white/10 px-4 py-3 outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />

            <input
              className="mb-3 w-full rounded-xl bg-white/10 px-4 py-3 outline-none"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />

            <button
              onClick={login}
              className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black"
            >
              Login
            </button>

            {message && <p className="mt-4 text-sm text-yellow-300">{message}</p>}
          </div>
        )}

        {token && (
          <>
            <div className="mt-8 flex items-center justify-between">
              <p className="text-emerald-400">Logged in</p>
              <button
                onClick={() => loadAccounts()}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"
              >
                Refresh
              </button>
            </div>

            {message && <p className="mt-4 text-sm text-yellow-300">{message}</p>}

            <div className="mt-6 grid gap-5">
              {accounts.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-slate-400">
                  No client accounts found.
                </div>
              ) : (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
                  >
                    <div className="grid gap-4 md:grid-cols-4">
                      <Info label="Name" value={account.name} />
                      <Info label="Platform" value={account.platform} />
                      <Info label="Broker" value={account.broker} />
                      <Info label="Login" value={account.account_login} />
                      <Info label="Status" value={account.status} />
                      <Info label="Risk Mode" value={account.risk_mode} />
                      <Info label="Max Lot" value={account.max_lot} />
                      <Info
                        label="Auto Trade"
                        value={account.auto_trade_enabled ? "ON" : "OFF"}
                      />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => action(account.id, "approve")}
                        className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-black"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => action(account.id, "reject")}
                        className="rounded-xl bg-red-400 px-4 py-3 font-black text-black"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() => action(account.id, "toggle-auto-trade")}
                        className="rounded-xl bg-yellow-400 px-4 py-3 font-black text-black"
                      >
                        Toggle Auto Trade
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words font-bold text-white">{String(value ?? "-")}</p>
    </div>
  );
}