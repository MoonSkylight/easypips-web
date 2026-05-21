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

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070D] text-white">
        <p className="text-slate-400">Loading client dashboard...</p>
      </main>
    );
  }

  return <EasyPipsShell page="dashboard" />;
}

