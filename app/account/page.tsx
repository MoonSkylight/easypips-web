"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function AccountDashboardPage() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [equity, setEquity] = useState<any>({});
  const [requests, setRequests] = useState<any[]>([]);
  const [requestForm, setRequestForm] = useState({
    type: "signal_request",
    desk: "Desk 1",
    message: "",
  });
  const [message, setMessage] = useState("Loading dashboard...");

  async function loadDashboard() {
    const token = localStorage.getItem("easypips_client_token");

    if (!token) {
      router.push("/client/login");
      return;
    }

    try {
      const [meRes, dashboardRes, requestsRes] = await Promise.all([
        fetch(`${API}/client/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/client/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/client/requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (meRes.status === 401 || dashboardRes.status === 401) {
        localStorage.removeItem("easypips_client_token");
        router.push("/client/login");
        return;
      }

      const meData = await meRes.json();
      const dashboardData = await dashboardRes.json();
      const requestsData = await requestsRes.json();

      setClient(meData.client || null);
      setAccount(dashboardData.account || null);
      setTrades(dashboardData.trades || []);
      setEquity(dashboardData.equity || {});
      setRequests(requestsData.requests || []);
      setMessage("");
    } catch {
      setMessage("Could not load dashboard.");
    }
  }

  async function sendRequest() {
    const token = localStorage.getItem("easypips_client_token");

    if (!token) {
      router.push("/client/login");
      return;
    }

    if (!requestForm.message.trim()) {
      setMessage("Please write your request message.");
      return;
    }

    setMessage("Sending request...");

    try {
      const res = await fetch(`${API}/client/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestForm),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("Request sent successfully.");
        setRequestForm({
          type: "signal_request",
          desk: "Desk 1",
          message: "",
        });
        loadDashboard();
      } else {
        setMessage(data.message || "Request failed.");
      }
    } catch {
      setMessage("Request error.");
    }
  }

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(loadDashboard, 30000);
    return () => clearInterval(timer);
  }, []);

  const curve = equity.curve || [];
  const maxBalance = useMemo(() => {
    const balances = curve.map((p: any) => Number(p.balance || 0));
    return Math.max(...balances, 1);
  }, [curve]);

  function logout() {
    localStorage.removeItem("easypips_client_token");
    router.push("/client/login");
  }

  return (
    <main className="min-h-screen bg-[#05070D] text-white">
      <header className="border-b border-white/10 bg-[#080C14] px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-black">My Dashboard</h1>
            <p className="text-xs text-slate-400">
              {client?.email || "EasyPips client account"}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadDashboard}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
            >
              Refresh
            </button>
            <button
              onClick={logout}
              className="rounded-xl bg-red-400 px-4 py-2 text-sm font-black text-black"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {message && (
          <div className="rounded-2xl bg-black/30 p-4 text-yellow-300">
            {message}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <TopCard title="Current Balance" value={`$${equity.currentBalance || 0}`} color="green" />
          <TopCard title="Growth" value={`${equity.growthPercent || 0}%`} color="gold" />
          <TopCard title="Win Rate" value={`${equity.winRate || 0}%`} color="blue" />
          <TopCard title="Total P/L" value={`$${equity.totalProfitLoss || 0}`} color="green" />
          <TopCard title="Trades" value={equity.totalTrades || 0} color="purple" />
          <TopCard title="Drawdown" value={`${equity.maxDrawdownPercent || 0}%`} color="red" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Panel title="MT4 / MT5 Account Status">
            {!account ? (
              <p className="text-slate-400">No account linked to this client.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Name" value={account.name} />
                <Info label="Platform" value={account.platform} />
                <Info label="Broker" value={account.broker} />
                <Info label="Login" value={account.account_login} />
                <Info label="Status" value={account.status} />
                <Info label="Risk Mode" value={account.risk_mode} />
                <Info label="Max Lot" value={account.max_lot} />
                <Info label="Auto Trade" value={account.auto_trade_enabled ? "ON" : "OFF"} />
                <Info label="Kill Switch" value={account.kill_switch ? "ON" : "OFF"} />
                <Info label="Consent" value={account.consent ? "YES" : "NO"} />
              </div>
            )}
          </Panel>

          <Panel title="Request Signal / Trade Help">
            <div className="space-y-3">
              <select
                value={requestForm.type}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, type: e.target.value })
                }
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
              >
                <option className="bg-[#05070D]" value="signal_request">
                  Request Custom Signal
                </option>
                <option className="bg-[#05070D]" value="trade_help">
                  Help With Running Trade
                </option>
                <option className="bg-[#05070D]" value="general_help">
                  General Help
                </option>
              </select>

              <select
                value={requestForm.desk}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, desk: e.target.value })
                }
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
              >
                <option className="bg-[#05070D]" value="Desk 1">
                  Desk 1
                </option>
                <option className="bg-[#05070D]" value="Desk 2">
                  Desk 2
                </option>
              </select>

              <textarea
                value={requestForm.message}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, message: e.target.value })
                }
                placeholder="Example: Can you check XAU/USD M15? Or should I hold my running EUR/USD trade?"
                className="min-h-32 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />

              <button
                onClick={sendRequest}
                className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black"
              >
                Send Request
              </button>
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Panel title="Equity Curve">
            {curve.length === 0 ? (
              <div className="flex h-72 items-center justify-center rounded-2xl bg-black/30 text-slate-400">
                No equity data yet.
              </div>
            ) : (
              <div className="flex h-72 items-end gap-2 rounded-2xl bg-black/30 p-5">
                {curve.map((point: any, index: number) => {
                  const height = Math.max((Number(point.balance || 0) / maxBalance) * 100, 8);
                  return (
                    <div key={index} className="flex flex-1 flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500 to-yellow-400"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[10px] text-slate-500">{index + 1}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Your Desk Requests">
            {requests.length === 0 ? (
              <p className="rounded-2xl bg-black/30 p-5 text-slate-400">
                No requests yet.
              </p>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div key={req.id} className="rounded-2xl bg-black/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black text-yellow-300">
                        {req.type} · {req.desk}
                      </p>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">
                        {req.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{req.message}</p>
                    {req.reply && (
                      <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                        <p className="text-xs font-black text-emerald-300">Desk Reply</p>
                        <p className="mt-1 text-sm text-slate-200">{req.reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Panel title="Trade History">
            {trades.length === 0 ? (
              <p className="rounded-2xl bg-black/30 p-5 text-slate-400">
                No trades recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-slate-400">
                      <th className="p-3">Symbol</th>
                      <th className="p-3">Direction</th>
                      <th className="p-3">Entry</th>
                      <th className="p-3">Result</th>
                      <th className="p-3">P/L</th>
                      <th className="p-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id} className="border-b border-white/5">
                        <td className="p-3 font-black">{trade.symbol}</td>
                        <td className="p-3">{trade.direction}</td>
                        <td className="p-3 font-mono">{trade.entry}</td>
                        <td className="p-3">{trade.result}</td>
                        <td
                          className={`p-3 font-black ${
                            Number(trade.profit_loss || 0) >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {trade.profit_loss}
                        </td>
                        <td className="p-3 font-mono">{trade.balance_after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Performance Summary">
            <SummaryRow label="Closed Trades" value={equity.closedTrades || 0} />
            <SummaryRow label="Wins" value={equity.wins || 0} green />
            <SummaryRow label="Losses" value={equity.losses || 0} red />
            <SummaryRow label="Starting Balance" value={`$${equity.startingBalance || 0}`} />
            <SummaryRow label="Current Balance" value={`$${equity.currentBalance || 0}`} green />
            <SummaryRow label="Total Profit/Loss" value={`$${equity.totalProfitLoss || 0}`} green />
            <SummaryRow label="Growth" value={`${equity.growthPercent || 0}%`} green />
            <SummaryRow label="Max Drawdown" value={`${equity.maxDrawdownPercent || 0}%`} red />
          </Panel>
        </section>
      </div>
    </main>
  );
}

function TopCard({
  title,
  value,
  color,
}: {
  title: string;
  value: any;
  color: "green" | "gold" | "blue" | "purple" | "red";
}) {
  const colors: any = {
    green: "border-emerald-400/20 text-emerald-300",
    gold: "border-yellow-400/20 text-yellow-300",
    blue: "border-blue-400/20 text-blue-300",
    purple: "border-purple-400/20 text-purple-300",
    red: "border-red-400/20 text-red-300",
  };

  return (
    <div className={`rounded-3xl border bg-white/[0.04] p-5 ${colors[color]}`}>
      <p className="text-xs font-black uppercase">{title}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
      <h2 className="mb-5 text-xl font-black">{title}</h2>
      {children}
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

function SummaryRow({
  label,
  value,
  green,
  red,
}: {
  label: string;
  value: any;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-3">
      <span className="text-slate-400">{label}</span>
      <span
        className={`font-black ${
          green ? "text-emerald-400" : red ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
