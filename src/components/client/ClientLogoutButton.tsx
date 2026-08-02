"use client";

import { useRouter } from "next/navigation";

export default function ClientLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/client/logout", { method: "POST" });
    router.push("/particulier/espace/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-client-700 hover:text-white"
    >
      Déconnexion
    </button>
  );
}
