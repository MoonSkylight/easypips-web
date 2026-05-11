"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const ADMIN_PASSWORD = "admin123"; // 🔒 change later

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("admin-auth", "true");
      window.location.href = "/admin";
    } else {
      setError("Wrong password");
    }
  }

  return (
    <main className="min-h-screen bg-[#05070d] flex items-center justify-center text-white">
      <form
        onSubmit={handleLogin}
        className="bg-slate-900 p-8 rounded-3xl border border-white/10 w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-4">Admin Login</h1>

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-xl bg-black border border-white/10 mb-4"
        />

        <button
          type="submit"
          className="w-full bg-emerald-400 text-black font-bold p-3 rounded-xl"
        >
          Login
        </button>

        {error && (
          <p className="text-red-400 mt-3 text-sm">{error}</p>
        )}
      </form>
    </main>
  );
}