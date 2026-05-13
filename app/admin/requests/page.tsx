"use client";

import { useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

export default function AdminRequestsPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  async function login() {
    setMessage("Logging in...");

    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!data.access_token) {
        setMessage(data.detail || "Login failed");
        return;
      }

      setToken(data.access_token);
      setMessage("Login success");
      loadRequests(data.access_token);
    } catch {
      setMessage("Login error");
    }
  }

  async function loadRequests(authToken = token) {
    try {
      const res = await fetch(`${API}/admin/client-requests`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await res.json();
      setRequests(data.requests || []);
    } catch {
      setMessage("Could not load requests");
    }
  }

  async function replyRequest(id: string, reply: string, desk: string) {
    if (!reply.trim()) {
      setMessage("Reply cannot be empty.");
      return;
    }

    setMessage("Sending reply...");

    try {
      const res = await fetch(`${API}/admin/client-requests/${id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reply,
          desk,
          status: "replied",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("Reply sent successfully.");
        loadRequests();
      } else {
        setMessage(data.message || "Reply failed.");
      }
    } catch {
      setMessage("Reply error.");
    }
  }

  return (
    <main className="min-h-screen bg-[#05070D] p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-black">Client Request Inbox</h1>
        <p className="mt-2 text-slate-400">
          Reply to custom signal requests and running-trade help.
        </p>

        {!token && (
          <div className="mt-8 max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <input
              className="mb-3 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
            <input
              className="mb-3 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <button
              onClick={login}
              className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black"
            >
              Login
            </button>
          </div>
        )}

        {token && (
          <>
            <div className="mt-8 flex justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="font-black text-emerald-400">Logged in</p>
              <button
                onClick={() => loadRequests()}
                className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black"
              >
                Refresh Requests
              </button>
            </div>

            {message && (
              <p className="mt-4 rounded-2xl bg-black/30 p-4 text-sm text-yellow-300">
                {message}
              </p>
            )}

            <div className="mt-6 grid gap-5">
              {requests.length === 0 ? (
                <p className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-slate-400">
                  No client requests yet.
                </p>
              ) : (
                requests.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    onReply={replyRequest}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function RequestCard({
  request,
  onReply,
}: {
  request: any;
  onReply: (id: string, reply: string, desk: string) => void;
}) {
  const [reply, setReply] = useState(request.reply || "");
  const [desk, setDesk] = useState(request.desk || "Desk 1");

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-yellow-300">
            {request.type} · {request.desk}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Account: {request.account_id || "-"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Created:{" "}
            {request.created_at
              ? new Date(request.created_at).toLocaleString()
              : "-"}
          </p>
        </div>

        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">
          {request.status}
        </span>
      </div>

      <div className="mt-5 rounded-2xl bg-black/30 p-4">
        <p className="text-xs font-black text-slate-500">Client Message</p>
        <p className="mt-2 text-slate-200">{request.message}</p>
      </div>

      <div className="mt-5 space-y-3">
        <select
          value={desk}
          onChange={(e) => setDesk(e.target.value)}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
        >
          <option className="bg-[#05070D]" value="Desk 1">
            Desk 1
          </option>
          <option className="bg-[#05070D]" value="Desk 2">
            Desk 2
          </option>
        </select>

        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write your desk reply..."
          className="min-h-28 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none placeholder:text-slate-500"
        />

        <button
          onClick={() => onReply(request.id, reply, desk)}
          className="rounded-xl bg-yellow-400 px-5 py-3 font-black text-black"
        >
          Send Reply
        </button>
      </div>
    </div>
  );
}
