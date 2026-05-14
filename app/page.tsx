"use client";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#05070D] text-white">
      <header className="border-b border-white/10 bg-[#080C14] px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black">
              EP
            </div>
            <div>
              <h1 className="text-xl font-black">
                Easy<span className="text-yellow-300">Pips</span>{" "}
                <span className="text-emerald-300">AI</span>
              </h1>
              <p className="text-xs text-slate-400">Smart Forex Signals</p>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="/client/signup"
              className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black"
            >
              Sign Up Free
            </a>
            <a
              href="/client/login"
              className="rounded-2xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10"
            >
              Sign In
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-yellow-300">
            Live AI + Desk Forex Signals
          </p>

          <h2 className="text-5xl font-black leading-tight md:text-6xl">
            Smart trading signals,
            <br />
            real-time tracking,
            <br />
            <span className="bg-gradient-to-r from-yellow-300 to-emerald-400 bg-clip-text text-transparent">
              free after signup.
            </span>
          </h2>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            EasyPips combines AI strategies, Desk 1 / Desk 2 manual signals,
            Telegram alerts, news, and performance tracking in one dashboard.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/client/signup"
              className="rounded-2xl bg-yellow-400 px-7 py-4 font-black text-black shadow-lg shadow-yellow-400/20"
            >
              Create Free Account
            </a>

            <a
              href="/dashboard"
              className="rounded-2xl border border-white/10 px-7 py-4 font-black text-white hover:bg-white/10"
            >
              View Dashboard Preview
            </a>

            <a
              href="https://t.me/easypips_signals_bot"
              target="_blank"
              className="rounded-2xl bg-emerald-400 px-7 py-4 font-black text-black"
            >
              Telegram
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
          <div className="grid gap-4">
            <Feature title="Free Preview" text="Visitors can view one signal before signup." />
            <Feature title="Full Access After Signup" text="Signed-up clients can view all signal cards." />
            <Feature title="AI + Human Desk" text="Strategy A, Strategy B, Desk 1, and Desk 2." />
            <Feature title="Telegram Alerts" text="Instant signal and TP/SL updates." />
            <Feature title="MT4 / MT5 Ready" text="Client onboarding with consent and approval." />
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <p className="font-black text-yellow-300">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}