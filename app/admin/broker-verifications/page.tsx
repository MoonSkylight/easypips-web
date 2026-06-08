"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

type Verification = {
  id: string;
  user_id?: string;
  broker_name?: string;
  broker_account_id?: string;
  registered_email?: string;
  proof_url?: string;
  status?: string;
  monthly_reward_status?: string;
  reward_coins?: number;
  last_reward_paid_date?: string;
  next_reward_date?: string;
  admin_notes?: string;
  submitted_at?: string;
  verified_at?: string;
};

export default function AdminBrokerVerificationsPage() {
  const [rows, setRows] = useState<Verification[]>([]);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("easypips_admin_token")
      : null;

  async function loadRows() {
    if (!token) {
      setMessage("Admin login required.");
      return;
    }

    const res = await fetch(`${API}/admin/broker-verifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    setRows(data.verifications || []);
  }

  useEffect(() => {
    loadRows();
  }, []);

  async function updateStatus(id: string, status: string) {
    setMessage("Updating...");

    const res = await fetch(`${API}/admin/broker-verifications/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status,
        monthly_reward_status:
          status === "Verified"
            ? "Active"
            : status === "Suspended"
            ? "Suspended"
            : "Pending",
        admin_notes: notes[id] || undefined,
      }),
    });

    const data = await res.json();

    if (data.success) {
      setMessage(`Broker verification marked ${status}.`);
      loadRows();
    } else {
      setMessage(data.message || "Unable to update.");
    }
  }

  async function payReward(id: string) {
    if (!confirm("Pay 10 EasyPips Coins for this verified broker account?")) return;

    setMessage("Paying reward...");

    const res = await fetch(`${API}/admin/broker-verifications/${id}/pay-monthly-reward`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (data.success) {
      setMessage("Monthly broker reward paid.");
      loadRows();
    } else {
      setMessage(data.message || "Unable to pay reward.");
    }
  }

  return (
    <main className="min-h-screen bg-[#030811] p-4 text-white">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-2xl border border-yellow-300/20 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-black">Broker Verification</h1>
          <p className="mt-2 text-sm text-slate-400">
            Verify broker accounts manually inside the broker IB portal before paying monthly coin rewards.
          </p>
          {message && <p className="mt-3 text-sm font-bold text-yellow-300">{message}</p>}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04]">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-400">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Broker</th>
                <th className="p-3">Account ID</th>
                <th className="p-3">Email</th>
                <th className="p-3">Proof</th>
                <th className="p-3">Status</th>
                <th className="p-3">Monthly</th>
                <th className="p-3">Last Paid</th>
                <th className="p-3">Next Reward</th>
                <th className="p-3">Notes</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="p-4 text-slate-400" colSpan={11}>
                    No broker verifications yet.
                  </td>
                </tr>
              ) : (
                rows.map((v) => (
                  <tr key={v.id} className="border-b border-white/5 align-top">
                    <td className="p-3 text-slate-300">
                      <div className="max-w-[160px] break-all text-xs">{v.user_id}</div>
                    </td>
                    <td className="p-3 font-black">{v.broker_name || "-"}</td>
                    <td className="p-3">{v.broker_account_id || "-"}</td>
                    <td className="p-3">{v.registered_email || "-"}</td>
                    <td className="p-3">
                      {v.proof_url ? (
                        <a
                          href={v.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-yellow-300 underline"
                        >
                          View proof
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3">
                      <span className="rounded-full bg-yellow-400/10 px-2 py-1 text-xs font-black text-yellow-300">
                        {v.status || "Pending"}
                      </span>
                    </td>
                    <td className="p-3">{v.monthly_reward_status || "Pending"}</td>
                    <td className="p-3 text-xs text-slate-400">
                      {v.last_reward_paid_date || "-"}
                    </td>
                    <td className="p-3 text-xs text-slate-400">
                      {v.next_reward_date || "-"}
                    </td>
                    <td className="p-3">
                      <textarea
                        defaultValue={v.admin_notes || ""}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [v.id]: e.target.value }))
                        }
                        placeholder="Admin notes"
                        className="min-h-20 w-56 rounded-xl border border-white/10 bg-black/40 p-2 text-xs"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex w-44 flex-col gap-2">
                        <button
                          onClick={() => updateStatus(v.id, "Verified")}
                          className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-black"
                        >
                          Verify
                        </button>

                        <button
                          onClick={() => updateStatus(v.id, "Rejected")}
                          className="rounded-lg bg-red-400 px-3 py-2 text-xs font-black text-black"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => updateStatus(v.id, "Suspended")}
                          className="rounded-lg bg-orange-400 px-3 py-2 text-xs font-black text-black"
                        >
                          Suspend
                        </button>

                        <button
                          onClick={() => payReward(v.id)}
                          disabled={v.status !== "Verified"}
                          className="rounded-lg bg-yellow-400 px-3 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Pay 10 Coins
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}