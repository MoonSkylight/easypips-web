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
              <h1 className="text-xl font-black">EasyPips</h1>
              <p className="text-xs text-slate-400">AI Forex Signal Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-4 text-sm font-black uppercase tracking-widest text-yellow-300">
              Free access to the EasyPips dashboard
            </p>

            <h2 className="text-5xl font-black leading-tight">
              Smart Forex Signals Built for{" "}
              <span className="text-yellow-400">Precision</span>
            </h2>

            <p className="mt-6 max-w-xl text-lg text-slate-300">
              Sign up free to access the EasyPips dashboard with live signals,
              signal history, market news, Strategy A, Fibonacci Strategy B,
              Desk 1 and Desk 2 support, and client account performance tracking.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/client/signup"
                className="rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black shadow-lg shadow-yellow-400/20"
              >
                Sign Up Free
              </a>

              <a
                href="/client/login"
                className="rounded-2xl border border-white/10 px-6 py-4 font-black text-white hover:bg-white/10"
              >
                Sign In
              </a>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              After login, clients can view all signals, news, history, and Desk
              support from the secure dashboard.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
            <h3 className="text-2xl font-black">Dashboard Access</h3>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Stat label="Live Signals" value="Unlocked" />
              <Stat label="Strategies" value="A + B" />
              <Stat label="Desks" value="1 + 2" />
              <Stat label="Tracking" value="24/7" />
            </div>

            <div className="mt-6 rounded-2xl bg-black/30 p-5">
              <p className="text-sm text-slate-400">Included After Sign Up</p>

              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <Item text="Live paid signals dashboard" />
                <Item text="Signal history and performance" />
                <Item text="Market news calendar" />
                <Item text="Desk 1 and Desk 2 request support" />
                <Item text="Client account performance and equity curve" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            title="AI Strategy Engine"
            text="Strategy A scans EMA, RSI, and momentum to find high-quality setups."
          />
          <Feature
            title="Fibonacci Strategy"
            text="Strategy B watches retracement zones and confirmation entries."
          />
          <Feature
            title="Desk 1 & Desk 2 Support"
            text="Clients can request custom signals or ask for help with running trades."
          />
        </div>
      </section>

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

function Item({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-2 w-2 rounded-full bg-yellow-400" />
      <span>{text}</span>
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