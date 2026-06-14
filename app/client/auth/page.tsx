"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function ClientAuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    account_id: "",
  });

  async function login() {
    setMessage("");
    const email = loginForm.email.trim().toLowerCase();
    const password = loginForm.password;

    if (!email || !password.trim()) return setMessage("Email and password are required.");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const msg = error.message.toLowerCase();
        setMessage(msg.includes("not confirmed") ? "Please verify your email before logging in." : error.message);
        return;
      }

      if (!data.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        setMessage("Please verify your email before logging in.");
        return;
      }

      const res = await fetch(`${API}/client/supabase-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: data.user.user_metadata?.name || "",
          account_id: data.user.user_metadata?.account_id || "",
        }),
      });

      const backend = await res.json();

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

  async function signup() {
    setMessage("");
    const email = signupForm.email.trim().toLowerCase();
    const password = signupForm.password.trim();

    if (!email || !password) return setMessage("Email and password are required.");
    if (password.length < 6) return setMessage("Password must be at least 6 characters.");

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/client/auth`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            name: signupForm.name.trim(),
            account_id: signupForm.account_id.trim() || "",
          },
        },
      });

      if (error) {
        setMessage(error.message || "Signup failed. Please try again.");
        return;
      }

      setTab("login");
      setMessage("Account created. Please check your email, verify it, then sign in.");
    } catch {
      setMessage("Signup error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    setMessage("");
    const email = loginForm.email.trim().toLowerCase();

    if (!email) return setMessage("Enter your email first, then click Forgot password.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/client/auth`,
      });

      setMessage(error ? error.message : "Password reset email sent. Please check your inbox.");
    } catch {
      setMessage("Unable to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#030811] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-yellow-300/15 bg-white/[0.035] shadow-2xl shadow-black/50 lg:grid-cols-2">
          <section className="relative hidden overflow-hidden bg-gradient-to-br from-yellow-300/10 via-emerald-400/5 to-black p-10 lg:block">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-yellow-300/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black">
                  EP
                </div>
                <div>
                  <h1 className="text-2xl font-black">
                    Easy<span className="text-yellow-300">Pips</span> AI
                  </h1>
                  <p className="text-sm text-slate-400">Premium AI trading signal portal</p>
                </div>
              </div>

              <h2 className="mt-12 text-5xl font-black leading-tight">
                Secure access to your AI signal dashboard.
              </h2>

              <p className="mt-5 max-w-xl text-slate-300">
                Sign in or create your account from one professional portal. Email verification is required before dashboard access.
              </p>

              <div className="mt-8 grid gap-3">
                {[
                  "Verified client access",
                  "Strategy A and Strategy C signals",
                  "Premium signal unlocking",
                  "Performance and trade history tracking",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-yellow-300/15 bg-black/30 px-4 py-3 text-sm font-bold text-slate-200">
                    <span className="mr-2 text-yellow-300">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-xl font-black text-black">
                EP
              </div>
              <h1 className="text-2xl font-black">EasyPips AI</h1>
              <p className="text-sm text-slate-400">Secure client access</p>
            </div>

            <h2 className="text-center text-3xl font-black">Welcome to EasyPips</h2>

            <div className="mx-auto mt-6 grid max-w-md grid-cols-2 border-b border-white/10">
              <button
                onClick={() => {
                  setTab("login");
                  setMessage("");
                }}
                className={`py-3 text-sm font-black ${tab === "login" ? "border-b-2 border-yellow-300 text-yellow-300" : "text-slate-400"}`}
              >
                Sign in
              </button>

              <button
                onClick={() => {
                  setTab("signup");
                  setMessage("");
                }}
                className={`py-3 text-sm font-black ${tab === "signup" ? "border-b-2 border-yellow-300 text-yellow-300" : "text-slate-400"}`}
              >
                Create an account
              </button>
            </div>

            <div className="mx-auto mt-8 max-w-md space-y-4">
              {tab === "login" ? (
                <>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-yellow-300/50"
                    placeholder="Email address"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  />

                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-yellow-300/50"
                    placeholder="Password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />

                  <button
                    onClick={login}
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-yellow-300 to-amber-500 px-5 py-3 font-black text-black shadow-lg shadow-yellow-500/20 disabled:opacity-60"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </button>

                  <button
                    onClick={forgotPassword}
                    disabled={loading}
                    className="w-full text-center text-sm font-bold text-yellow-300 hover:text-yellow-200"
                  >
                    Forgot password?
                  </button>
                </>
              ) : (
                <>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-yellow-300/50"
                    placeholder="Full name"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  />

                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-yellow-300/50"
                    placeholder="Email address"
                    type="email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  />

                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-yellow-300/50"
                    placeholder="Password"
                    type="password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  />

                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-yellow-300/50"
                    placeholder="Account ID optional"
                    value={signupForm.account_id}
                    onChange={(e) => setSignupForm({ ...signupForm, account_id: e.target.value })}
                  />

                  <button
                    onClick={signup}
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-yellow-300 to-amber-500 px-5 py-3 font-black text-black shadow-lg shadow-yellow-500/20 disabled:opacity-60"
                  >
                    {loading ? "Creating account..." : "Create an account"}
                  </button>
                </>
              )}

              {message && (
                <div className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-center text-sm font-bold text-yellow-200">
                  {message}
                </div>
              )}

              <p className="pt-3 text-center text-xs text-slate-500">
                By continuing, you agree to use EasyPips for educational signal tracking and account access only.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}