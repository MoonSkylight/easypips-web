"use client";

import { useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function ClientLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function login() {
    setMessage("Logging in...");

    try {
      const res = await fetch(`${API}/client/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.access_token) {
        setMessage(data.detail || "Login failed");
        return;
      }

      // ✅ SAVE TOKEN
      localStorage.setItem("easypips_client_token", data.access_token);

      // ✅ FORCE RELOAD (IMPORTANT)
      window.location.href = "/dashboard";
    } catch {
      setMessage("Login error");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#05070D] text-white">
      <div className="w-full max-w-md p-6 bg-black/30 rounded-2xl">
        <h2 className="text-2xl font-black mb-4">Client Sign In</h2>

        <input
          className="w-full mb-3 p-3 rounded bg-white/10"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full mb-3 p-3 rounded bg-white/10"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full bg-yellow-400 text-black font-black py-3 rounded"
        >
          Sign In
        </button>

        {message && (
          <p className="mt-3 text-sm text-yellow-300">{message}</p>
        )}
      </div>
    </main>
  );
}