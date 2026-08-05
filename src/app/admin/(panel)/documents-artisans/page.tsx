import { redirect } from "next/navigation";

export default function LegacyAdminDocumentsArtisansRedirect() {
  redirect("/admin/artisans/documents");
}
