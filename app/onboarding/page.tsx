"use client";

import Link from "next/link";
import { useState } from "react";

const pairs = ["XAU/USD", "EUR/USD", "GBP/USD", "USD/JPY", "BTC/USD", "ETH/USD", "NAS100"];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [selectedPairs, setSelectedPairs] = useState<string[]>([]);

  function togglePair(pair: string) {
    setSelectedPairs((prev) =>
      prev.includes(pair) ? prev.filter((p) => p !== pair) : [...prev, pair]
    );
  }

  function finishOnboarding() {
    localStorage.setItem(
      "easypips-onboarding",
      JSON.stringify({ completed: true, selectedPairs })
    );
    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-[#030811] px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 shadow-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-yellow-300">
              EasyPips AI Setup
            </p>
            <h1 className="mt-2 text-4xl font-black">Welcome to EasyPips AI</h1>
          </div>

          <div className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300">
            Step {step} / 4
          </div>
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-3xl font-black">How EasyPips Works</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <Info title="Strategy A" subtitle="Momentum AI" text="EMA + RSI + momentum-based signal engine." />
              <Info title="Strategy B" subtitle="SMC Sniper" text="Liquidity sweeps, CHoCH/BOS and smart money zones." />
              <Info title="Strategy C" subtitle="ICT High RR" text="Small SL and high RR setups using ICT concepts." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-3xl font-black">Choose Preferred Pairs</h2>
            <p className="mt-3 text-slate-400">Select instruments you want to focus on.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {pairs.map((pair) => {
                const active = selectedPairs.includes(pair);
                return (
                  <button
                    key={pair}
                    onClick={() => togglePair(pair)}
                    className={`rounded-3xl border p-5 text-left ${
                      active
                        ? "border-yellow-400/40 bg-yellow-400/10"
                        : "border-white/10 bg-black/30 hover:bg-white/10"
                    }`}
                  >
                    <p className="text-xl font-black">{pair}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      {active ? "Selected" : "Tap to select"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-[2rem] border border-yellow-400/30 bg-yellow-400/[0.05] p-8 text-center">
            <h2 className="text-4xl font-black">Join Telegram Updates</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">
              Get instant signal delivery, TP updates, and premium trading notifications.
            </p>
            <a
              href="https://t.me/"
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black hover:bg-yellow-300"
            >
              Join Telegram
            </a>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-3xl font-black">Upgrade to Premium</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="rounded-[2rem] border border-yellow-400/30 bg-yellow-400/[0.05] p-6">
                <h3 className="text-3xl font-black text-yellow-300">Premium Access</h3>
                <div className="mt-5 space-y-3">
                  {["Strategy A/B/C", "Live Signals", "History + Reports", "Premium Telegram", "MT4/MT5 access"].map((item) => (
                    <div key={item} className="rounded-2xl bg-black/30 px-4 py-3">
                      ✓ {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6">
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">
                  Launch Offer
                </p>
                <div className="mt-5 flex items-end gap-2">
                  <span className="text-6xl font-black">$79</span>
                  <span className="pb-2 text-slate-400">/ month</span>
                </div>
                <Link
                  href="/pricing"
                  className="mt-8 block rounded-2xl bg-yellow-400 px-5 py-4 text-center font-black text-black hover:bg-yellow-300"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="rounded-2xl border border-white/10 px-6 py-4 font-black disabled:opacity-40 hover:bg-white/10"
          >
            Back
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black hover:bg-yellow-300"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={finishOnboarding}
              className="rounded-2xl bg-emerald-400 px-6 py-4 font-black text-black hover:bg-emerald-300"
            >
              Open Dashboard
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function Info({
  title,
  subtitle,
  text,
}: {
  title: string;
  subtitle: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <p className="text-sm font-black uppercase text-yellow-300">{title}</p>
      <h3 className="mt-3 text-2xl font-black">{subtitle}</h3>
      <p className="mt-3 text-sm text-slate-300">{text}</p>
    </div>
  );
}