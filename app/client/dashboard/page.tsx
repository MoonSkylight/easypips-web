"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EasyPipsShell from "../../components/EasyPipsShell";
import { supabase } from "@/lib/supabase";

export default function ClientDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const token = localStorage.getItem("easypips_client_token");

      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!token || !user?.email_confirmed_at) {
        localStorage.removeItem("easypips_client_token");
        await supabase.auth.signOut();
        router.push("/client/login");
        return;
      }

      setReady(true);
    }

    checkAccess();
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