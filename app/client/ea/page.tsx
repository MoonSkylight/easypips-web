"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function ClientEAPage() {
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("easypips_client_token");
    if (!token) {
      router.push("/client/login");
      return;
    }

    fetch(`${API}/client/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setAccount(data.account || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#05070D] text-white">Loading EA access...</main>;
  }

  return (
    <main className="min-h-screen bg-[#05070D] p-6 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <h1 className="text-4xl font-black text-yellow-300">EA Access</h1>

        {!account ? (
          <p className="mt-5 text-slate-400">No MT5 account linked yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            <Box label="Broker" value={account.broker} />
            <Box label="Platform" value={account.platform} />
            <Box label="MT5 Login" value={account.account_login} />
            <Box label="Status" value={account.status} />
            <Box label="Auto Trade" value={account.auto_trade_enabled ? "ON" : "OFF"} />
            <Box label="License Code" value={account.license_code || "Not generated"} mono />

            <div className="flex flex-wrap gap-3 pt-3">
              <button
                onClick={() => navigator.clipboard.writeText(account.license_code || "")}
                className="rounded-xl bg-white/10 px-4 py-2 font-black"
              >
                Copy License
              </button>

              <a
                href="/downloads/EasyPipsCopier.ex5"
                download
                className="rounded-xl bg-yellow-400 px-4 py-2 font-black text-black"
              >
                Download EA
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Box({ label, value, mono = false }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-black/30 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={mono ? "mt-1 font-mono text-yellow-300" : "mt-1 font-black"}>
        {value || "-"}
      </p>
    </div>
  );
}