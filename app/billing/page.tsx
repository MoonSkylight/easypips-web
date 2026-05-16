"use client";

import Link from "next/link";

export default function BillingPage() {
  function disablePremium() {
    localStorage.removeItem("easypips-premium-access");
    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-[#030811] px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-yellow-300">
              Billing Center
            </p>
            <h1 className="mt-2 text-4xl font-black">Manage Subscription</h1>
            <p className="mt-2 text-slate-400">
              Stripe customer portal will connect here in the next step.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black hover:bg-yellow-300"
          >
            Dashboard
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-yellow-400/30 bg-yellow-400/[0.05] p-6">
            <p className="text-sm font-black text-yellow-300">Current Plan</p>
            <h2 className="mt-3 text-4xl font-black">Premium</h2>
            <p className="mt-2 text-slate-400">$79 / month</p>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/30 bg-emerald-400/[0.05] p-6">
            <p className="text-sm font-black text-emerald-300">Status</p>
            <h2 className="mt-3 text-4xl font-black">Active</h2>
            <p className="mt-2 text-slate-400">Preview mode enabled</p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6">
            <p className="text-sm font-black text-slate-300">Next Billing</p>
            <h2 className="mt-3 text-4xl font-black">Stripe</h2>
            <p className="mt-2 text-slate-400">Coming soon</p>
          </div>
        </div>

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.045] p-6">
          <h2 className="text-2xl font-black">Billing Actions</h2>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black hover:bg-yellow-300"
            >
              Change Plan
            </Link>

            <button className="rounded-2xl border border-white/10 px-5 py-3 font-black hover:bg-white/10">
              Open Stripe Portal Soon
            </button>

            <button
              onClick={disablePremium}
              className="rounded-2xl border border-red-400/30 px-5 py-3 font-black text-red-300 hover:bg-red-400/10"
            >
              Disable Preview Access
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
