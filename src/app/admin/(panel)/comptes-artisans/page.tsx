import { redirect } from "next/navigation";

export default function LegacyAdminComptesArtisansRedirect() {
  redirect("/admin/artisans/comptes");
}
