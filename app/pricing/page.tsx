"use client";

import Link from "next/link";

const packages = [
  {
    name: "Starter",
    coins: "5 Coins",
    price: "$7.50",
    tag: "Launch Offer",
    subtitle: "Perfect for testing EasyPips",
  },
  {
    name: "Trader",
    coins: "10 Coins",
    price: "$15",
    tag: "Popular",
    subtitle: "Best for active traders",
  },
  {
    name: "Pro",
    coins: "25 Coins",
    price: "$35",
    tag: "Best Value",
    subtitle: "Lower effective coin cost",
  },
  {
    name: "Elite",
    coins: "60 Coins",
    price: "$75",
    tag: "Professional",
    subtitle: "Maximum launch discount",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#030811] px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="mb-4 inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-yellow-300">
            EASYPIPS COINS
          </p>

          <h1 className="text-5xl font-black md:text-7xl">
            Buy Coins.
            <br />
            <span className="bg-gradient-to-r from-yellow-300 to-emerald-400 bg-clip-text text-transparent">
              Unlock Premium Signals.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-slate-300">
            Launch Pricing: 1 Coin = $1.50
            <br />
            Standard Signal = 1 Coin
            <br />
            Premium Signal = 2 Coins
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {packages.map((pack) => (
            <div
              key={pack.name}
              className="rounded-3xl border border-yellow-300/20 bg-white/[0.04] p-6"
            >
              <div className="mb-4 inline-block rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-black">
                {pack.tag}
              </div>

              <h3 className="text-2xl font-black">{pack.name}</h3>

              <p className="mt-4 text-5xl font-black text-yellow-300">
                {pack.coins}
              </p>

              <p className="mt-2 text-4xl font-black">
                {pack.price}
              </p>

              <p className="mt-4 text-sm text-slate-300">
                {pack.subtitle}
              </p>

              <button className="mt-8 w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black hover:bg-yellow-300">
                Buy {pack.coins}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-yellow-300/20 bg-white/[0.04] p-6">
  <div className="text-center">
    <p className="text-xs font-black uppercase tracking-widest text-yellow-300">
      Manual USDT Payment
    </p>
    <h2 className="mt-2 text-3xl font-black">Submit Your Transaction Hash</h2>
    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
      Pay with USDT (TRC20), then submit your transaction hash below for manual coin crediting.
    </p>
    <p className="mt-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black text-slate-200">
      USDT TRC20 Wallet: TNVYxfehv8MYkAcTwrMyuBHt4J6ZHootQF
    </p>
  </div>

  <form
    className="mx-auto mt-6 grid max-w-2xl gap-3"
    onSubmit={async (e) => {
      e.preventDefault();

      const fd = new FormData(e.currentTarget);

      const res = await fetch("https://easypips-api.onrender.com/payment-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          package: fd.get("package"),
          tx_hash: fd.get("tx_hash"),
          contact: fd.get("contact"),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Submission failed");
        return;
      }

      alert("Payment submitted. Admin will verify and credit your coins.");
      e.currentTarget.reset();
    }}
  >
    <select
      name="package"
      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
    >
      <option>Starter - 5 Coins - $7.50</option>
      <option>Trader - 10 Coins - $15</option>
      <option>Pro - 25 Coins - $35</option>
      <option>Elite - 60 Coins - $75</option>
    </select>

    <input
      name="tx_hash"
      placeholder="USDT TRC20 transaction hash"
      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
    />

    <input
      name="contact"
      placeholder="Telegram username or email"
      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
    />

    <button className="rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black hover:bg-yellow-300">
      Submit Payment Hash
    </button>
  </form>
</div>

        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-2xl border border-white/10 px-6 py-4 font-black hover:bg-white/10"
          >
            Open Dashboard
          </Link>

          <Link
            href="/help-center"
            className="rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black hover:bg-yellow-300"
          >
            Contact Support
          </Link>
        </div>
      </section>
    </main>
  );
}
