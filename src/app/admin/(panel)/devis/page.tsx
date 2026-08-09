import { redirect } from "next/navigation";

/** Devis plateforme retiré. */
export default function AdminDevisRetiredPage() {
  redirect("/admin/particuliers/demandes");
}