"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function ClientSignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    account_id: "",
  });

  const [message, setMessage] = useState("");

  async function signup() {
    setMessage("Creating account...");

    if (!form.email.trim() || !form.password.trim()) {
      setMessage("Email and password are required.");
      return;
    }

    try {
      const res = await fetch(`${API}/client/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          account_id: form.account_id.trim() === "" ? null : form.account_id.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.access_token) {
        setMessage(data.detail || data.message || "Signup failed");
        return;
      }

      localStorage.setItem("easypips_client_token", data.access_token);
      router.push("/dashboard");
    } catch {
      setMessage("Signup error. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[#05070D] p-6 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center">
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
              Create your free client account.
            </h2>

            <p className="mt-5 max-w-xl text-slate-300">
              Sign up free to access the EasyPips dashboard, live signal preview,
              market news, signal history, and client tools.
            </p>

            <div className="mt-8 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-5">
              <p className="font-black text-yellow-300">Account ID is optional</p>
              <p className="mt-2 text-sm text-slate-300">
                Leave it blank if you do not have an MT4/MT5 account linked yet.
                Admin can connect it later.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
            <h3 className="text-2xl font-black">Client Sign Up</h3>

            <div className="mt-6 space-y-3">
              <input
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <input
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <input
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                placeholder="Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />

              <input
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                placeholder="Account ID optional"
                value={form.account_id}
                onChange={(e) =>
                  setForm({ ...form, account_id: e.target.value })
                }
              />

              <button
                onClick={signup}
                className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black"
              >
                Create Free Account
              </button>

              <button
                onClick={() => router.push("/client/login")}
                className="w-full rounded-2xl border border-white/10 px-5 py-4 font-black text-white hover:bg-white/10"
              >
                Already have account? Sign In
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