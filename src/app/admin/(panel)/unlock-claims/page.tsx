import { redirect } from "next/navigation";

/** Anti-churn retiré — le déblocage contact est le service livré. */
export default function AdminUnlockClaimsRetiredPage() {
  redirect("/admin/particuliers/comptes");
}
