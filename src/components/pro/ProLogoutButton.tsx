"use client";

import { useRouter } from "next/navigation";

export default function ProLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/pro/logout", { method: "POST" });
    router.push("/pro/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-800 hover:text-white"
    >
      Déconnexion
    </button>
  );
}
