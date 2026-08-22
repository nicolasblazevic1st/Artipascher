import { permanentRedirect } from "next/navigation";
import { PUBLIC_OFFERS_PATH } from "@/lib/public-offers";

export default function EncheresRedirect() {
  permanentRedirect(PUBLIC_OFFERS_PATH);
}
