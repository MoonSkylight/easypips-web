"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

const BROKERS = [
  {
    name: "Broker 1",
    description: "Recommended EasyPips partner broker.",
    affiliateLink: "https://your-ib-link-broker-1.com",
  },
  {
    name: "Broker 2",
    description: "Alternative broker option for EasyPips users.",
    affiliateLink: "https://your-ib-link-broker-2.com",
  },
  {
    name: "Broker 3",
    description: "Use only if available in your country.",
    affiliateLink: "https://your-ib-link-broker-3.com",
  },
];

export default function ClientBrokersPage() {
  const [brokerName, setBrokerName] = useState(BROKERS[0].name);
  const [brokerAccountId, setBrokerAccountId] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [message, setMessage] = useState("");
  const [verifications, setVerifications] = useState<any[]>([]);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("easypips_client_token")
      : null;

  async function loadVerifications() {
    if (!token) return;

    const res = await fetch(`${API}/client/broker-verifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    setVerifications(data.verifications || []);
  }

  useEffect(() => {
    loadVerifications();
  }, []);

  async function openBroker(broker: any) {
    if (!token) {
      alert("Please login first.");
      window.location.href = "/client/login";
      return;
    }

    await fetch(`${API}/client/broker-click`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        broker_name: broker.name,
        affiliate_link_clicked: broker.affiliateLink,
      }),
    });

    window.open(broker.affiliateLink, "_blank", "noopener,noreferrer");
  }

  async function submitVerification(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      alert("Please login first.");
      window.location.href = "/client/login";
      return;
    }

    setMessage("Submitting...");

    const res = await fetch(`${API}/client/broker-verification-submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        broker_name: brokerName,
        broker_account_id: brokerAccountId,
        registered_email: registeredEmail,
        proof_url: proofUrl,
      }),
    });

    const data = await res.json();

    if (data.success) {
      setMessage("Broker verification submitted. Admin will verify it in the IB portal.");
      setBrokerAccountId("");
      setRegisteredEmail("");
      setProofUrl("");
      loadVerifications();
    } else {
      setMessage(data.message || "Unable to submit verification.");
    }
  }

  return (
    <main className="min-h-screen bg-[#030811] p-4 text-white">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-2xl border border-yellow-300/20 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
            EasyPips Recommended Brokers
          </p>
          <h1 className="mt-2 text-3xl font-black">Broker IB Rewards</h1>
          <p className="mt-2 text-sm text-slate-400">
            Open through our official IB link, submit your broker account details, and receive 10 EasyPips Coins per month only after admin verification.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {BROKERS.map((broker) => (
            <div
              key={broker.name}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <h2 className="text-xl font-black">{broker.name}</h2>
              <p className="mt-2 text-sm text-slate-400">{broker.description}</p>

              <button
                onClick={() => openBroker(broker)}
                className="mt-4 w-full rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black hover:bg-yellow-300"
              >
                Open Account
              </button>

              <p className="mt-2 text-[10px] text-slate-500">
                Click is tracked only. Coins require manual IB verification.
              </p>
            </div>
          ))}
        </div>

        <form
          onSubmit={submitVerification}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
        >
          <h2 className="text-xl font-black">Submit Broker Verification</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select
              value={brokerName}
              onChange={(e) => setBrokerName(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-3"
            >
              {BROKERS.map((broker) => (
                <option key={broker.name}>{broker.name}</option>
              ))}
            </select>

            <input
              value={brokerAccountId}
              onChange={(e) => setBrokerAccountId(e.target.value)}
              required
              placeholder="Broker account ID / trading account number"
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-3"
            />

            <input
              value={registeredEmail}
              onChange={(e) => setRegisteredEmail(e.target.value)}
              placeholder="Registered broker email"
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-3"
            />

            <input
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="Proof screenshot URL"
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-3"
            />
          </div>

          <button className="mt-4 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-black">
            Submit for Verification
          </button>

          {message && <p className="mt-3 text-sm text-yellow-300">{message}</p>}
        </form>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <h2 className="text-xl font-black">My Broker Reward Status</h2>

          <div className="mt-4 space-y-2">
            {verifications.length === 0 ? (
              <p className="text-sm text-slate-400">No broker verification submitted yet.</p>
            ) : (
              verifications.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-black">{v.broker_name}</span>
                    <span className="text-yellow-300">{v.status}</span>
                  </div>
                  <p className="mt-1 text-slate-400">
                    Account: {v.broker_account_id}
                  </p>
                  <p className="text-slate-400">
                    Monthly reward: {v.monthly_reward_status}
                  </p>
                  <p className="text-slate-500">
                    Last paid: {v.last_reward_paid_date || "-"} · Next: {v.next_reward_date || "-"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}