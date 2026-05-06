"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email for login link.");
    }

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6">
        <h1 className="mb-4 text-2xl font-bold">Login / Signup</h1>

        <input
          type="email"
          placeholder="Enter your email"
          className="w-full rounded-xl bg-gray-800 p-3 mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-xl bg-white p-3 font-bold text-black"
        >
          {loading ? "Sending..." : "Login / Sign up"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-yellow-400">{message}</p>
        )}
      </div>
    </main>
  );
}