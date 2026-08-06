"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface NotifItem {
  id: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt?: string;
}

export default function NotificationsList({
  audience,
}: {
  audience: "client" | "pro";
}) {
  const api =
    audience === "client" ? "/api/client/notifications" : "/api/pro/notifications";
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(api);
    const data = await res.json();
    if (res.ok) setItems(data.notifications ?? []);
    setLoading(false);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAll() {
    await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await load();
  }

  if (loading) {
    return <p className="mt-8 text-sm text-slate-500">Chargement…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        Aucune notification pour le moment.
      </p>
    );
  }

  return (
    <div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => void markAll()}
          className="text-sm font-medium text-slate-600 underline hover:text-slate-900"
        >
          Tout marquer comme lu
        </button>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              onClick={() => {
                if (!item.readAt) {
                  void fetch(api, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: [item.id] }),
                  });
                }
              }}
              className={`block rounded-xl border p-4 transition hover:border-slate-300 ${
                item.readAt
                  ? "border-slate-200 bg-white"
                  : "border-amber-200 bg-amber-50/60"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
