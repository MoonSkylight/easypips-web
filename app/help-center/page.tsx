import Link from "next/link";

export default function HelpCenterPage() {
  return (
    <main className="min-h-screen bg-[#030811] px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h1 className="text-4xl font-black">Help Center</h1>
          <p className="mt-2 text-slate-400">
            Contact support for account, billing, Telegram, MT4/MT5 and premium access help.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/[0.06] p-6">
            <h2 className="text-2xl font-black text-yellow-300">Premium Support</h2>
            <p className="mt-3 text-slate-300">
              Need help with premium access, locked signals, or billing?
            </p>
            <a
              href="https://t.me/"
              target="_blank"
              className="mt-5 block rounded-2xl bg-yellow-400 px-5 py-3 text-center font-black text-black"
            >
              Contact Admin
            </a>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.06] p-6">
            <h2 className="text-2xl font-black text-emerald-300">MT4 / MT5 Help</h2>
            <p className="mt-3 text-slate-300">
              Submit a connection request or get help connecting your trading account.
            </p>
            <Link
              href="/account"
              className="mt-5 block rounded-2xl border border-white/10 px-5 py-3 text-center font-black"
            >
              Account Page
            </Link>
          </div>

          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.06] p-6">
            <h2 className="text-2xl font-black text-cyan-300">FAQ Coming Soon</h2>
            <p className="mt-3 text-slate-300">
              We will add repeated questions, trading rules, billing help and onboarding support here.
            </p>
            <Link
              href="/dashboard"
              className="mt-5 block rounded-2xl border border-white/10 px-5 py-3 text-center font-black"
            >
              Back Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}