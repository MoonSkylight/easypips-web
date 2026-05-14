"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function ClientLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("test@easypips.com");
  const [password, setPassword] = useState("123456");
  const [message, setMessage] = useState("");

  async function login() {
    setMessage("Logging in...");

    try {
      const res = await fetch(`${API}/client/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.access_token) {
        setMessage(data.detail || data.message || "Login failed");
        return;
      }

      localStorage.setItem("easypips_client_token", data.access_token);
      window.location.href = "/dashboard";
    } catch {
      setMessage("Login error. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[#05070D] p-6 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-2 lg:items-center">
          <section>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black">
                EP
              </div>
              <div>
                <h1 className="text-2xl font-black">EasyPips</h1>
                <p className="text-sm text-slate-400">Client Access Portal</p>
              </div>
            </div>

            <h2 className="text-5xl font-black leading-tight">
              Sign in to unlock all signals.
            </h2>

            <p className="mt-5 max-w-xl text-slate-300">
              Access live signals, signal history, market news, Desk support,
              and your EasyPips client dashboard.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
            <h3 className="text-2xl font-black">Client Sign In</h3>

            <div className="mt-6 space-y-3">
              <input
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                onClick={login}
                className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black"
              >
                Sign In
              </button>

              <button
                onClick={() => router.push("/client/signup")}
                className="w-full rounded-2xl border border-white/10 px-5 py-4 font-black text-white hover:bg-white/10"
              >
                Create Free Account
              </button>

              {message && (
                <p className="rounded-xl bg-black/30 p-3 text-center text-sm text-yellow-300">
                  {message}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}