"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface NotifItem {
  id: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt?: string;
}

type Audience = "client" | "pro";

export default function NotificationBell({
  audience,
  listHref,
  accent = "client",
}: {
  audience: Audience;
  listHref: string;
  accent?: "client" | "brand";
}) {
  const api =
    audience === "client" ? "/api/client/notifications" : "/api/pro/notifications";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(api);
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications ?? []);
    setUnread(data.unreadCount ?? 0);
  }, [api]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function markAllRead() {
    await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await load();
  }

  async function openItem(item: NotifItem) {
    if (!item.readAt) {
      await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id] }),
      });
    }
    setOpen(false);
    window.location.href = item.href;
  }

  const panelBg = accent === "brand" ? "bg-brand-900" : "bg-client-900";
  const hoverBg = accent === "brand" ? "hover:bg-brand-700" : "hover:bg-client-700";
  const badge = accent === "brand" ? "bg-amber-400 text-amber-950" : "bg-amber-400 text-amber-950";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className={`relative flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition ${hoverBg} hover:text-white`}
        aria-label="Notifications"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>🔔</span>
          Notifications
        </span>
        {unread > 0 && (
          <span
            className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${badge}`}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 z-40 mt-1 max-h-80 overflow-auto rounded-xl border border-white/10 ${panelBg} p-2 shadow-xl`}
        >
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-xs font-medium text-white/80">Récentes</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[11px] text-white/70 underline hover:text-white"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-white/50">
              Aucune notification
            </p>
          ) : (
            <ul className="space-y-1">
              {items.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void openItem(item)}
                    className={`w-full rounded-lg px-2 py-2 text-left text-xs transition ${
                      item.readAt ? "text-white/70" : "bg-white/10 text-white"
                    } hover:bg-white/15`}
                  >
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 opacity-80">{item.body}</p>
                    <p className="mt-1 text-[10px] opacity-50">
                      {new Date(item.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={listHref}
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-lg px-2 py-2 text-center text-xs font-medium text-white/90 underline hover:text-white"
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  );
}
