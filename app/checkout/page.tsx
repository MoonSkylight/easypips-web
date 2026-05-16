```tsx
"use client";

import Link from "next/link";

const plans = {
  free: {
    name: "Free",
    price: "$0",
    subtitle: "Starter preview access",
    features: [
      "Dashboard preview",
      "Limited signals",
      "Free Telegram updates",
    ],
  },
  premium: {
    name: "Premium",
    price: "$79",
    subtitle: "Full EasyPips AI access",
    features: [
      "Real-time signals",
      "Strategy A/B/C",
      "History + reports",
      "Premium Telegram group",
      "MT4/MT5 request access",
    ],
  },
  vip: {
    name: "VIP",
    price: "$199",
    subtitle: "Advanced trader access",
    features: [
      "Everything in Premium",
      "Private Help Desk",
      "VIP Telegram",
      "Future copy trading access",
    ],
  },
};

export default function CheckoutPage() {
  const plan = plans.premium;

  function enablePreview() {
    localStorage.setItem("easypips-premium-access", "true");
    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#030811] px-6 py-10 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-140px] top-[-140px] h-[420px] w-[420px] rounded-full bg-yellow-400/10 blur-[120px]" />
        <div className="absolute right-[-180px] top-[160px] h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-[140px]" />
      </div>

      <section className="relative mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 shadow-2xl shadow-black/30">
          <p className="mb-4 inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-yellow-300">
            Checkout Preview
          </p>

          <h1 className="text-5xl font-black">
            Complete your <span className="text-yellow-300">{plan.name}</span> access
          </h1>

          <p className="mt-4 max-w-2xl text-slate-300">
            This checkout page is ready for Stripe connection. For now, use the
            preview button to test premium dashboard access.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <input
              placeholder="Full name"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 outline-none"
            />

            <input
              placeholder="Email address"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 outline-none"
            />

            <input
              placeholder="Card number - Stripe coming soon"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 outline-none md:col-span-2"
            />

            <input
              placeholder="MM / YY"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 outline-none"
            />

            <input
              placeholder="CVC"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 outline-none"
            />
          </div>

          <button
            onClick={enablePreview}
            className="mt-6 w-full rounded-2xl bg-yellow-400 px-6 py-4 font-black text-black hover:bg-yellow-300"
          >
            Activate Premium Preview
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            Real Stripe payments will be connected in the next step.
          </p>
        </div>

        <aside className="rounded-[2rem] border border-yellow-400/30 bg-yellow-400/[0.05] p-8 shadow-2xl shadow-black/30">
          <p className="text-sm font-black uppercase tracking-widest text-yellow-300">
            Selected Plan
          </p>

          <div className="mt-5 flex items-end gap-2">
            <span className="text-6xl font-black">{plan.price}</span>
            <span className="pb-2 text-slate-400">/ month</span>
          </div>

          <h2 className="mt-3 text-3xl font-black">{plan.name}</h2>
          <p className="mt-2 text-slate-300">{plan.subtitle}</p>

          <div className="mt-8 space-y-3">
            {plan.features.map((feature: string) => (
              <div
                key={feature}
                className="flex items-center gap-3 rounded-2xl bg-black/30 px-4 py-3"
              >
                <span className="text-emerald-300">✓</span>
                <span className="text-sm text-slate-200">{feature}</span>
              </div>
            ))}
          </div>

          <Link
            href="/pricing"
            className="mt-6 block rounded-2xl border border-white/10 px-5 py-4 text-center font-black hover:bg-white/10"
          >
            Change Plan
          </Link>
        </aside>
      </section>
    </main>
  );
}
```

Replace:

```txt
app/checkout/page.tsx
```

Then run:

```powershell
npm run build
```
