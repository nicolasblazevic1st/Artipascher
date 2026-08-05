import { redirect } from "next/navigation";

export default function LegacyAdminDemandesRedirect() {
  redirect("/admin/particuliers/demandes");
}
