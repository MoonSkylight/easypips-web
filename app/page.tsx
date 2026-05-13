"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070D] text-white">
      <div className="text-center">
        <p className="text-lg text-slate-400">Loading EasyPips Dashboard...</p>
      </div>
    </main>
  );
}