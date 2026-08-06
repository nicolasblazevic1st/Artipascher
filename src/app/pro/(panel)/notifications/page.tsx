import type { Metadata } from "next";
import NotificationsList from "@/components/NotificationsList";

export const metadata: Metadata = {
  title: "Notifications",
};

export default function ProNotificationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
      <p className="mt-1 text-sm text-slate-600">
        Acceptations client, validation de devis et chantiers retenus.
      </p>
      <NotificationsList audience="pro" />
    </div>
  );
}
