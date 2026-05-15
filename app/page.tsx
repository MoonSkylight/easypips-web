"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#030811] px-6 py-10 text-white">
      <section className="mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-center">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black">
            EP
          </div>
          <div>
            <h1 className="text-2xl font-black">
              Easy<span className="text-yellow-300">Pips</span>{" "}
              <span className="text-emerald-300">AI</span>
            </h1>
            <p className="text-sm text-slate-400">Smart Forex Signals</p>
          </div>
        </div>

        <p className="mb-4 inline-flex w-fit rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-yellow-300">
          Live AI + Smart Money Forex Signals
        </p>

        <h2 className="max-w-4xl text-5xl font-black leading-tight md:text-7xl">
          Premium trading signals
          <br />
          powered by confirmation,
          <br />
          <span className="bg-gradient-to-r from-yellow-300 to-emerald-400 bg-clip-text text-transparent">
            strategy and risk control.
          </span>
        </h2>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          EasyPips AI combines Strategy A, Strategy B, Strategy C, Help Desk,
          Telegram alerts, history, reports, performance, and MT4/MT5 account
          connection requests in one dashboard.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="rounded-2xl bg-yellow-400 px-7 py-4 font-black text-black"
          >
            Open Dashboard
          </Link>

          <Link
            href="/client/signup"
            className="rounded-2xl border border-white/10 px-7 py-4 font-black text-white hover:bg-white/10"
          >
            Sign Up Free
          </Link>

          <Link
            href="/client/login"
            className="rounded-2xl border border-white/10 px-7 py-4 font-black text-white hover:bg-white/10"
          >
            Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
