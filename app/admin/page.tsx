"use client";

import { useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined"
      ? localStorage.getItem("admin-token")
      : null
  );

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const [desk, setDesk] = useState("Desk 1");

  const [form, setForm] = useState({
    symbol: "XAU/USD",
    direction: "BUY",
    entry: "",
    sl: "",
    tp1: "",
    tp2: "",
    tp3: "",
  });

  async function login() {
    setMessage("Logging in...");

    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!data.access_token) {
        setMessage("Login failed");
        return;
      }

      localStorage.setItem("admin-token", data.access_token);
      setToken(data.access_token);
      setMessage("Login success");
    } catch {
      setMessage("Backend connection failed");
    }
  }

  async function publish() {
    setMessage("Publishing...");

    try {
      const res = await fetch(`${API}/admin/publish-desk-signal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          desk,
          ...form,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setMessage("Publish failed");
        return;
      }

      setMessage("Signal sent ✅");
    } catch {
      setMessage("Error sending signal");
    }
  }

  function logout() {
    localStorage.removeItem("admin-token");
    setToken(null);
  }

  // 🔐 LOGIN SCREEN
  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070D] text-white">
        <div className="w-full max-w-md p-6 bg-black/30 rounded-2xl">
          <h2 className="text-2xl font-black mb-4">Admin Login</h2>

          <input
            className="w-full mb-3 p-3 rounded bg-white/10"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="w-full mb-3 p-3 rounded bg-white/10"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={login}
            className="w-full bg-yellow-400 text-black py-3 rounded font-black"
          >
            Login
          </button>

          {message && <p className="mt-3 text-sm">{message}</p>}
        </div>
      </main>
    );
  }

  // ✅ ADMIN PANEL
  return (
    <main className="min-h-screen bg-[#05070D] text-white p-6">
      <h1 className="text-3xl font-black mb-5">Admin Desk Publish</h1>

      <button
        onClick={logout}
        className="mb-5 px-4 py-2 bg-red-400 text-black rounded"
      >
        Logout
      </button>

      <select
        value={desk}
        onChange={(e) => setDesk(e.target.value)}
        className="mb-3 p-3 bg-black rounded"
      >
        <option>Desk 1</option>
        <option>Desk 2</option>
      </select>

      {["symbol", "direction", "entry", "sl", "tp1", "tp2", "tp3"].map(
        (f) => (
          <input
            key={f}
            placeholder={f}
            value={(form as any)[f]}
            onChange={(e) =>
              setForm({ ...form, [f]: e.target.value })
            }
            className="block w-full mb-2 p-3 bg-white/10 rounded"
          />
        )
      )}

      <button
        onClick={publish}
        className="mt-3 px-5 py-3 bg-green-400 text-black rounded font-black"
      >
        Publish Signal
      </button>

      {message && <p className="mt-3">{message}</p>}
    </main>
  );
}