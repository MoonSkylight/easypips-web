"use client";

import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

type Referral = {
  id: string;
  referral_code?: string;
  status?: string;
  reward_coins?: number;
  created_at?: string;
  rewarded_at?: string;
  referred_user_id?: string;
};

export default function ClientReferralsPage() {
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [rewardCoins, setRewardCoins] = useState(10);
  const [rows, setRows] = useState<Referral[]>([]);
  const [message, setMessage] = useState("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("easypips_client_token")
      : null;

  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === "Pending").length;
    const verified = rows.filter((r) => r.status === "Verified").length;
    const totalCoins = rows
      .filter((r) => r.status === "Verified")
      .reduce((sum, r) => sum + Number(r.reward_coins || 10), 0);

    return { total: rows.length, pending, verified, totalCoins };
  }, [rows]);

  async function loadReferral() {
    if (!token) {
      setMessage("Please login first.");
      return;
    }

    const codeRes = await fetch(`${API}/client/referral`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const codeData = await codeRes.json();

    if (codeData.success) {
      setReferralCode(codeData.referral_code || "");
      setReferralLink(codeData.referral_link || "");
      setRewardCoins(Number(codeData.reward_coins || 10));
    }

    const rowsRes = await fetch(`${API}/client/referrals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const rowsData = await rowsRes.json();

    setRows(rowsData.referrals || []);
  }

  useEffect(() => {
    loadReferral();
  }, []);

  async function copyLink() {
    const value = referralLink || referralCode;

    if (!value) return;

    await navigator.clipboard.writeText(value);
    setMessage("Referral link copied.");
    setTimeout(() => setMessage(""), 2500);
  }

  return (
    <main className="min-h-screen bg-[#030811] p-4 text-white">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-2xl border border-yellow-300/20 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
            EasyPips Referral Program
          </p>

          <h1 className="mt-2 text-3xl font-black">Invite Friends. Earn Coins.</h1>

          <p className="mt-2 text-sm text-slate-400">
            Share your referral link. When your friend registers and buys coins, you receive {rewardCoins} EasyPips Coins automatically.
          </p>

          {message && (
            <p className="mt-3 rounded-xl border border-yellow-300/20 bg-yellow-400/10 px-3 py-2 text-sm font-black text-yellow-300">
              {message}
            </p>
          )}
        </section>

        <section className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Your Referral Code
            </p>

            <div className="mt-3 rounded-2xl border border-yellow-300/20 bg-black/40 p-4">
              <p className="break-all text-3xl font-black text-yellow-300">
                {referralCode || "Loading..."}
              </p>
              <p className="mt-2 break-all text-sm text-slate-400">
                {referralLink || "Referral link loading..."}
              </p>
            </div>

            <button
              onClick={copyLink}
              className="mt-4 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black hover:bg-yellow-300"
            >
              Copy Referral Link
            </button>
          </div>

          <div className="grid gap-2">
            <Stat label="Total Referrals" value={stats.total} />
            <Stat label="Pending" value={stats.pending} />
            <Stat label="Rewarded" value={stats.verified} />
            <Stat label="Coins Earned" value={stats.totalCoins} />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <h2 className="text-xl font-black">Referral History</h2>

          <div className="mt-4 space-y-2">
            {rows.length === 0 ? (
              <p className="text-sm text-slate-400">
                No referrals yet. Share your link to start earning coins.
              </p>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-black text-white">
                      {r.referral_code || referralCode}
                    </span>
                    <span
                      className={`font-black ${
                        r.status === "Verified"
                          ? "text-emerald-300"
                          : "text-yellow-300"
                      }`}
                    >
                      {r.status || "Pending"}
                    </span>
                  </div>

                  <p className="mt-1 text-slate-400">
                    Reward: {Number(r.reward_coins || 10)} coins
                  </p>

                  <p className="text-xs text-slate-500">
                    Created: {r.created_at || "-"} · Rewarded: {r.rewarded_at || "-"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}