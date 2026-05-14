"use client";

import { useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function ClientLoginPage() {
  const [email, setEmail] = useState("test2@easypips.com");
  const [password, setPassword] = useState("123456");
  const [message, setMessage] = useState("");

  async function login() {
    setMessage("Logging in...");

    try {
      const res = await fetch(`${API}/client/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.access_token) {
        setMessage(data.detail || data.message || "Login failed");
        return;
      }

      localStorage.setItem("easypips_client_token", data.access_token);

      document.cookie =
        "easypips_client_token=" +
        data.access_token +
        "; path=/; max-age=604800; SameSite=Lax";

      window.location.replace("/dashboard");
    } catch {
      setMessage("Login error. Please try again.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#05070D] text-white p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h1 className="text-2xl font-black">Client Sign In</h1>

        <input
          className="mt-6 w-full rounded-xl bg-white/10 px-4 py-3 outline-none"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="mt-3 w-full rounded-xl bg-white/10 px-4 py-3 outline-none"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="mt-4 w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black"
        >
          Sign In
        </button>

        {message && (
          <p className="mt-4 rounded-xl bg-black/30 p-3 text-center text-sm text-yellow-300">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}