"use client";

import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://easypips-api.onrender.com";

type NotificationItem = {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  is_read?: boolean;
  created_at?: string;
};

export default function NotificationsPage() {
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [message, setMessage] = useState("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("easypips_client_token")
      : null;

  const unread = useMemo(
    () => rows.filter((n) => !n.is_read).length,
    [rows]
  );

  async function loadNotifications() {
    if (!token) {
      setMessage("Please login first.");
      return;
    }

    const res = await fetch(`${API}/client/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    setRows(data.notifications || []);
  }

  async function markAllRead() {
    if (!token) return;

    const res = await fetch(`${API}/client/notifications/read-all`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (data.success) {
      loadNotifications();
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <main className="min-h-screen bg-[#030811] p-4 text-white">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-2xl border border-yellow-300/20 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
                Notifications Center
              </p>

              <h1 className="mt-2 text-3xl font-black">
                Your Notifications
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Payments, referrals, broker rewards, and account activity.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="rounded-xl border border-yellow-300/20 bg-yellow-400/10 px-4 py-3 text-sm font-black text-yellow-300">
                {unread} Unread
              </div>

              <button
                onClick={markAllRead}
                className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black hover:bg-yellow-300"
              >
                Mark All Read
              </button>
            </div>
          </div>

          {message && (
            <div className="mt-3 rounded-xl border border-yellow-300/20 bg-yellow-400/10 px-3 py-2 text-sm font-black text-yellow-300">
              {message}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="space-y-3">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-slate-400">
                No notifications yet.
              </div>
            ) : (
              rows.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-4 ${
                    n.is_read
                      ? "border-white/10 bg-black/30"
                      : "border-yellow-300/20 bg-yellow-400/5"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-black text-white">
                        {n.title || "Notification"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        {n.message}
                      </p>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-xs font-black ${
                          n.is_read
                            ? "text-slate-500"
                            : "text-yellow-300"
                        }`}
                      >
                        {n.is_read ? "READ" : "UNREAD"}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {n.created_at || "-"}
                      </div>
                    </div>
                  </div>

                  {n.type && (
                    <div className="mt-3 inline-flex rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {n.type}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}