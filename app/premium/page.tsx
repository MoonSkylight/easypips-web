"use client";

import Link from "next/link";

export default function PremiumPage() {
  return (
    <main className="min-h-screen bg-[#030811] px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-yellow-400/30 bg-yellow-400/[0.05] p-8 text-center shadow-2xl shadow-black/30">
        <p className="text-sm font-black uppercase tracking-widest text-yellow-300">
          Premium Access
        </p>

        <h1 className="mt-4 text-5xl font-black">
          Unlock the full EasyPips AI experience
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-slate-300">
          Premium unlocks Strategy B, Strategy C, live signals, history,
          reports, premium Telegram delivery, and MT4/MT5 request access.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/pricing"
            className="rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black hover:bg-yellow-300"
          >
            View Pricing
          </Link>

          <Link
            href="/checkout?plan=premium"
            className="rounded-2xl border border-white/10 px-6 py-4 font-black hover:bg-white/10"
          >
            Go Premium
          </Link>
        </div>
      </section>
    </main>
  );
}
