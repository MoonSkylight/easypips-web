"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function ClientLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      setMessage("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();

        if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
          setMessage("Please verify your email before logging in.");
          return;
        }

        setMessage(error.message || "Login failed. Please check your details.");
        return;
      }

      if (!data.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        setMessage("Please verify your email before logging in.");
        return;
      }

      let res = await fetch(`${API}/client/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      let backend = await res.json();

            if (!backend.access_token) {
        res = await fetch(`${API}/client/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            name: data.user.user_metadata?.name || "",
            account_id: data.user.user_metadata?.account_id || "",
          }),
        });

        backend = await res.json();

        const backendMessage = String(
          backend.detail || backend.message || ""
        ).toLowerCase();

        if (!backend.access_token && backendMessage.includes("already registered")) {
          const retry = await fetch(`${API}/client/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail, password }),
          });

          backend = await retry.json();
        }
      }

      if (!backend.access_token) {
        setMessage(backend.detail || backend.message || "Login failed.");
        return;
      }

      localStorage.setItem("easypips_client_token", backend.access_token);
      router.push("/client/dashboard");
    } catch {
      setMessage("Login error. Please try again.");
    } finally {
      setLoading(false);
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
                <h1 className="text-2xl font-black">EasyPips Client Portal</h1>
                <p className="text-sm text-slate-400">Account performance and signal tracking</p>
              </div>
            </div>

            <h2 className="text-5xl font-black leading-tight">
              Track your copied trades and equity curve.
            </h2>

            <p className="mt-5 max-w-xl text-slate-300">
              Login after email verification to view your account status,
              trade history, and signals.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {["Verified Login", "Equity Curve", "Trade History"].map((x) => (
                <div
                  key={x}
                  className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm font-black text-yellow-300"
                >
                  {x}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
            <h3 className="text-2xl font-black">Client Login</h3>
            <p className="mt-2 text-sm text-slate-400">
              Use your verified client email and password.
            </p>

            <div className="mt-6 space-y-3">
              <input
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                onClick={login}
                disabled={loading}
                className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              <button
                onClick={() => router.push("/client/signup")}
                className="w-full rounded-2xl border border-white/10 px-5 py-4 font-black text-white hover:bg-white/10"
              >
                Create Account
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