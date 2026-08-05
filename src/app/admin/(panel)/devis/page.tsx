import { redirect } from "next/navigation";

export default function LegacyAdminDevisRedirect() {
  redirect("/admin/artisans/devis");
}
