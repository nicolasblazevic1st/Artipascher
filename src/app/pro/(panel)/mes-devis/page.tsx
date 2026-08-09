import { redirect } from "next/navigation";

/** Devis plateforme retiré — redirection vers les contacts. */
export default function MesDevisRetiredPage() {
  redirect("/pro/contacts");
}
