"use client";

import { useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function AdminLogin() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Logging in...");

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.access_token) {
        setMessage("Wrong username or password");
        return;
      }

      localStorage.setItem("admin-token", data.access_token);
      window.location.href = "/admin";
    } catch (error) {
      console.error(error);
      setMessage("Backend connection failed");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070d] px-5 text-white">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-8 shadow-2xl"
      >
        <p className="mb-3 inline-flex rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-black">
          EASY PIPS ADMIN
        </p>

        <h1 className="text-3xl font-black">Admin Login</h1>

        <p className="mt-2 text-sm text-slate-400">
          Enter admin credentials to access Desk 1 and Desk 2 publishing.
        </p>

        <div className="mt-6 grid gap-4">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="rounded-xl border border-white/10 bg-black p-3"
            required
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded-xl border border-white/10 bg-black p-3"
            required
          />

          <button
            type="submit"
            className="rounded-xl bg-emerald-400 p-3 font-black text-black hover:bg-emerald-300"
          >
            Login
          </button>

          {message && (
            <p className="rounded-xl bg-white/10 p-3 text-center text-sm">
              {message}
            </p>
          )}
        </div>
      </form>
    </main>
  );
}