"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Verifying your EasyPips account...");

  useEffect(() => {
    async function finishVerification() {
      try {
        const { error } = await supabase.auth.getSession();

        if (error) {
          setMessage(error.message || "Verification failed. Please try logging in again.");
          return;
        }

        setMessage("Email verified successfully. Redirecting to sign in...");
        setTimeout(() => router.replace("/client/auth?verified=1"), 1200);
      } catch {
        setMessage("Verification failed. Please open EasyPips and sign in again.");
      }
    }

    finishVerification();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030811] px-4 text-white">
      <div className="max-w-md rounded-3xl border border-yellow-300/20 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/50">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black">
          EP
        </div>
        <h1 className="text-2xl font-black">EasyPips Verification</h1>
        <p className="mt-3 text-sm font-bold text-slate-300">{message}</p>
      </div>
    </main>
  );
}