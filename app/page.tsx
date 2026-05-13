"use client";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#05070D] text-white">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-[#080C14] px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* LOGO */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black">
              EP
            </div>
            <div>
              <h1 className="text-xl font-black">EasyPips</h1>
              <p className="text-xs text-slate-400">
                AI Forex Signal Engine
              </p>
            </div>
          </div>

          {/* NAV BUTTONS */}
          <div className="flex items-center gap-3">
            <a
              href="/client/signup"
              className="rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black"
            >
              Sign Up
            </a>

            <a
              href="/client/login"
              className="rounded-2xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10"
            >
              Sign In
            </a>

            <a
              href="https://t.me/easypips_signals_bot"
              target="_blank"
              className="rounded-2xl bg-emerald-400 px-5 py-3 font-black text-black"
            >
              Telegram
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-5xl font-black leading-tight">
              Smart Forex Signals Built for{" "}
              <span className="text-yellow-400">Precision</span>
            </h2>

            <p className="mt-6 max-w-xl text-lg text-slate-300">
              EasyPips combines AI strategies and professional trading desks to
              deliver high-quality signals with real-time performance tracking.
            </p>

            <div className="mt-8 flex gap-4">
              <a
                href="/client/signup"
                className="rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black"
              >
                Get Started
              </a>

              <a
                href="/client/login"
                className="rounded-2xl border border-white/10 px-6 py-4 font-black text-white hover:bg-white/10"
              >
                Client Login
              </a>
            </div>
          </div>

          {/* RIGHT CARD */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
            <h3 className="text-2xl font-black">Live System</h3>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Stat label="Signals" value="Live" />
              <Stat label="Strategies" value="2+" />
              <Stat label="Desks" value="2" />
              <Stat label="Tracking" value="24/7" />
            </div>

            <div className="mt-6 rounded-2xl bg-black/30 p-5">
              <p className="text-sm text-slate-400">System Status</p>
              <p className="mt-2 text-2xl font-black text-emerald-400">
                RUNNING
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            title="AI Strategy Engine"
            text="Advanced EMA, RSI, and momentum-based signal generation."
          />
          <Feature
            title="Fibonacci System"
            text="Precision entries using retracement and continuation patterns."
          />
          <Feature
            title="Client Dashboard"
            text="Track trades, equity curve, and account performance in real time."
          />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-slate-500">
        EasyPips is for educational purposes only. Trading involves risk.
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h3 className="text-xl font-black">{title}</h3>
      <p className="mt-3 text-sm text-slate-400">{text}</p>
    </div>
  );
}