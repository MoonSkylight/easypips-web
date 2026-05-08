"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin() {
    if (!password.trim()) {
      setError("Enter password.");
      return;
    }

    document.cookie = `easypips_admin_session=${encodeURIComponent(
      password
    )}; path=/; max-age=28800; samesite=lax`;

    window.location.href = "/admin";
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full rounded-[28px] border border-white/10 bg-[#0b1627] p-6 shadow-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Easypips Admin
          </p>
          <h1 className="mt-2 text-2xl font-bold">Admin Login</h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter the password to access the publishing panel.
          </p>

          <div className="mt-5 space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Admin password"
              className="w-full rounded-2xl border border-white/10 bg-[#0f1c31] px-4 py-3 outline-none"
            />

            <button
              onClick={handleLogin}
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-bold text-slate-950"
            >
              Login
            </button>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </div>
        </div>
      </div>
    </main>
  );
}