"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const onboarding = localStorage.getItem("easypips-onboarding");

      if (!onboarding) {
        router.replace("/onboarding");
      } else {
        router.replace("/dashboard");
      }
    } catch {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030811] text-white">
      <div className="text-center">
        <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />

        <h1 className="text-3xl font-black">
          Easy<span className="text-yellow-300">Pips</span>{" "}
          <span className="text-emerald-300">AI</span>
        </h1>

        <p className="mt-3 text-slate-400">Preparing your dashboard...</p>
      </div>
    </main>
  );
}