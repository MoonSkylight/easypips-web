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
}