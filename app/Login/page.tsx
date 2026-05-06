"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");

  async function login() {
    await supabase.auth.signInWithOtp({ email });
    alert("Check your email for login link");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-gray-900 p-6 rounded-xl w-80">
        <h1 className="text-xl mb-4">Login</h1>

        <input
          className="w-full p-2 mb-3 text-black"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full bg-yellow-400 text-black p-2 rounded"
        >
          Login
        </button>
      </div>
    </main>
  );
}