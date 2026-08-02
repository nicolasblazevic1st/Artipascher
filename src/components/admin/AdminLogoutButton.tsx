"use client";

export default function AdminLogoutButton() {
  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-800"
    >
      Déconnexion
    </button>
  );
}
