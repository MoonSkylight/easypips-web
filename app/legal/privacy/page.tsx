export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#05070D] px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">

        <h1 className="text-4xl font-black text-cyan-300">
          Privacy Policy
        </h1>

        <p className="mt-6 text-slate-300">
          EasyPips AI respects your privacy and is committed
          to protecting user data responsibly.
        </p>

        <p className="mt-4 text-slate-300">
          We may collect information including:
        </p>

        <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-300">
          <li>Name and email address</li>
          <li>Account login details</li>
          <li>Payment and subscription information</li>
          <li>Trading preferences</li>
          <li>Telegram usernames</li>
          <li>Browser and device information</li>
          <li>IP address and usage analytics</li>
        </ul>

        <p className="mt-6 text-slate-300">
          Your information is used to:
        </p>

        <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-300">
          <li>Provide platform access</li>
          <li>Deliver trading signals</li>
          <li>Improve platform performance</li>
          <li>Enhance security and fraud prevention</li>
          <li>Process subscriptions and payments</li>
        </ul>

        <p className="mt-6 text-slate-300">
          EasyPips AI does not sell personal information to third parties.
        </p>

        <p className="mt-4 text-slate-300">
          Third-party services such as payment processors,
          analytics providers, hosting providers, and Telegram
          integrations may process limited information necessary
          for platform operation.
        </p>

        <p className="mt-4 text-slate-300">
          While reasonable security measures are implemented,
          no internet-based platform can guarantee absolute security.
        </p>

        <p className="mt-4 text-slate-300">
          By using EasyPips AI, users consent to this Privacy Policy
          and the collection and use of information as described.
        </p>

      </div>
    </main>
  );
}