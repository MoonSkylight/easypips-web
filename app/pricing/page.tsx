# EasyPips AI — Pricing Page

Create:

```txt
app/pricing/page.tsx
```

Paste this full code:

```tsx
"use client";

import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    subtitle: "Starter preview access",
    color: "border-white/10",
    button: "bg-white/10 text-white",
    features: [
      "Dashboard preview",
      "Delayed signals",
      "Limited pairs",
      "Limited history",
      "Free Telegram updates",
    ],
  },
  {
    name: "Premium",
    price: "$79",
    subtitle: "Full EasyPips AI access",
    color: "border-yellow-400/40",
    button: "bg-yellow-400 text-black",
    popular: true,
    features: [
      "Real-time signals",
      "Strategy A access",
      "Strategy B access",
      "Strategy C access",
      "History + reports",
      "Premium Telegram group",
      "MT4/MT5 request access",
      "Priority support",
    ],
  },
  {
    name: "VIP",
    price: "$199",
    subtitle: "Advanced trader access",
    color: "border-emerald-400/40",
    button: "bg-emerald-400 text-black",
    features: [
      "Everything in Premium",
      "Private help desk",
      "VIP Telegram",
      "Copy trading access",
      "Future MetaAPI integration",
      "Early AI features",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030811] px-6 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-yellow-400/10 blur-[120px]" />
        <div className="absolute right-[-120px] top-[160px] h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-[140px]" />
      </div>

      <section className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <p className="mb-4 inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-yellow-300">
            EASYPIPS AI MEMBERSHIP
          </p>

          <h1 className="text-5xl font-black md:text-7xl">
            Smart Forex Signals
            <br />
            <span className="bg-gradient-to-r from-yellow-300 to-emerald-400 bg-clip-text text-transparent">
              Powered by AI + Smart Money
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Access Strategy A, Strategy B, Strategy C, live dashboards,
            Telegram delivery, performance reports, and MT4/MT5 integration.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative overflow-hidden rounded-[2rem] border ${plan.color} bg-white/[0.045] p-7 shadow-2xl shadow-black/30 backdrop-blur-xl`}
            >
              {plan.popular && (
                <div className="absolute right-4 top-4 rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-black">
                  MOST POPULAR
                </div>
              )}

              <p className="text-sm font-black uppercase tracking-widest text-slate-400">
                {plan.name}
              </p>

              <div className="mt-5 flex items-end gap-2">
                <span className="text-6xl font-black">{plan.price}</span>
                <span className="pb-2 text-slate-400">/ month</span>
              </div>

              <p className="mt-3 text-slate-300">{plan.subtitle}</p>

              <div className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 rounded-2xl bg-black/30 px-4 py-3"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-black text-emerald-300">
                      ✓
                    </div>
                    <span className="text-sm text-slate-200">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className={`mt-8 w-full rounded-2xl px-5 py-4 font-black transition hover:scale-[1.01] ${plan.button}`}
              >
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-2xl border border-white/10 px-6 py-4 font-black hover:bg-white/10"
          >
            Open Dashboard
          </Link>

          <a
            href="https://t.me/"
            target="_blank"
            className="rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black"
          >
            Join Telegram
          </a>
        </div>
      </section>
    </main>
  );
}
```

Then push:

```powershell
git add app/pricing/page.tsx
git commit -m "add pricing page"
git push origin main
```

Open:

```txt
/pricing
```
