import { redirect } from "next/navigation";

/** Devis plateforme retiré. */
export default function AdminArtisansDevisRetiredPage() {
  redirect("/admin/particuliers/demandes");
}
