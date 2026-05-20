"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EasyPipsShell from "../../components/EasyPipsShell";

export default function ClientDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("easypips_client_token");

    if (!token) {
      router.push("/client/login");
      return;
    }

    setReady(true);
  }, [router]);

  function logout() {
    localStorage.removeItem("easypips_client_token");
    router.push("/client/login");
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070D] text-white">
        <p className="text-slate-400">Loading client dashboard...</p>
      </main>
    );
  }

  return (
    <div className="relative">
      <div className="fixed right-6 top-24 z-50 flex gap-3">
        <a
          href="/account"












          className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-lg"
        >
          Account / EA
        </a>

        <button
          type="button"
          onClick={logout}
          className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white shadow-lg"
        >
          Logout
        </button>
      </div>















      <EasyPipsShell page="dashboard" />
    </div>
  );
}

