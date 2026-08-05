import { redirect } from "next/navigation";

export default function LegacyAdminEncheresRedirect() {
  redirect("/admin/particuliers/encheres");
}
