import { redirect } from "next/navigation";

/** Enchères retirées — redirection vers les chantiers. */
export default function MesEncheresRetiredPage() {
  redirect("/pro/encheres");
}
