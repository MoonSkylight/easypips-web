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
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!data.access_token) {
        setMessage(data.detail || "Login failed");
        return;
      }
      setToken(data.access_token);
      setMessage("Login success");
      loadAccounts(data.access_token);
    } catch {
      setMessage("Login error");
    }
  }

  async function loadAccounts(authToken = token) {
    try {
      const res = await fetch(`${API}/admin/client-accounts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch {
      setMessage("Could not load accounts");
    }
  }

  async function action(
    id: string,
    type: "approve" | "reject" | "toggle-auto-trade"
  ) {
    setMessage("Updating...");
    try {
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
    } catch {
      setMessage("Update error");
    }
  }

  async function updateRisk(accountId: string, riskMode: string, maxLot: string) {
    setMessage("Updating risk settings...");
    try {
      const res = await fetch(
        `${API}/admin/client-accounts/${accountId}/update-risk`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            risk_mode: riskMode,
            max_lot: Number(maxLot),
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setMessage("Risk settings updated");
        loadAccounts();
      } else {
        setMessage(data.message || "Risk update failed");
      }
    } catch {
      setMessage("Risk update error");
    }
  }

  return (
    <main className="min-h-screen bg-[#05070D] p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-black">Admin Client Accounts</h1>
            <p className="mt-2 text-slate-400">
              Approve MT4/MT5 accounts, manage risk, and control auto-trading.
            </p>
          </div>

          {token && (
            <button
              onClick={() => {
                setToken("");
                setAccounts([]);
                setPassword("");
                setMessage("Logged out");
              }}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/20"
            >
              Logout
            </button>
          )}
        </div>

        {!token && (
          <div className="mt-8 max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-black">Admin Login</h2>

            <input
              className="mb-3 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />

            <input
              className="mb-3 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
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

            {message && (
              <p className="mt-4 text-sm text-yellow-300">{message}</p>
            )}
          </div>
        )}

        {token && (
          <>
            <div className="mt-8 flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:flex-row md:items-center">
              <div>
                <p className="font-black text-emerald-400">Logged in</p>
                <p className="text-sm text-slate-400">
                  Manage client trading account permissions.
                </p>
              </div>

              <button
                onClick={() => loadAccounts()}
                className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black"
              >
                Refresh Accounts
              </button>
            </div>

            {message && (
              <p className="mt-4 rounded-2xl bg-black/30 p-4 text-sm text-yellow-300">
                {message}
              </p>
            )}

            <div className="mt-6 grid gap-5">
              {accounts.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-slate-400">
                  No client accounts found.
                </div>
              ) : (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <h2 className="text-2xl font-black">
                          {account.name || "Client Account"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                          {account.platform || "MT"} · {account.broker || "Broker not set"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          label={account.status || "pending"}
                          color={
                            account.status === "approved"
                              ? "green"
                              : account.status === "rejected"
                              ? "red"
                              : "yellow"
                          }
                        />
                        <Badge
                          label={account.auto_trade_enabled ? "AUTO ON" : "AUTO OFF"}
                          color={account.auto_trade_enabled ? "green" : "red"}
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-4">
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

                    <RiskControls account={account} onSave={updateRisk} />

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

                    <p className="mt-4 text-xs leading-5 text-slate-500">
                      Auto-trading should only be enabled after client consent,
                      risk settings, max lot size, and account verification are complete.
                    </p>
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

function RiskControls({
  account,
  onSave,
}: {
  account: any;
  onSave: (id: string, riskMode: string, maxLot: string) => void;
}) {
  const [riskMode, setRiskMode] = useState(account.risk_mode || "manual");
  const [maxLot, setMaxLot] = useState(String(account.max_lot || "0.01"));

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="mb-3 text-sm font-black text-yellow-300">Risk Controls</p>

      <div className="grid gap-3 md:grid-cols-3">
        <select
          value={riskMode}
          onChange={(e) => setRiskMode(e.target.value)}
          className="rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
        >
          <option className="bg-[#05070D]" value="manual">
            Manual approval
          </option>
          <option className="bg-[#05070D]" value="copy">
            Copy signals
          </option>
        </select>

        <input
          value={maxLot}
          onChange={(e) => setMaxLot(e.target.value)}
          placeholder="Max lot"
          className="rounded-xl bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
        />

        <button
          onClick={() => onSave(account.id, riskMode, maxLot)}
          className="rounded-xl bg-blue-400 px-4 py-3 font-black text-black"
        >
          Save Risk
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words font-bold text-white">
        {String(value ?? "-")}
      </p>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: "green" | "red" | "yellow" }) {
  const colors = {
    green: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
    red: "bg-red-400/10 text-red-300 border-red-400/30",
    yellow: "bg-yellow-400/10 text-yellow-300 border-yellow-400/30",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${colors[color]}`}>
      {label}
    </span>
  );
}
