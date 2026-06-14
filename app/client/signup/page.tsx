"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectToAuthPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/client/auth");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030811] text-white">
      <p className="text-sm font-bold text-slate-400">Redirecting to EasyPips secure access...</p>
    </main>
  );
}
