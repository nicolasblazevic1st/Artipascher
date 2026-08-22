import { permanentRedirect } from "next/navigation";
import { publicOfferPath } from "@/lib/public-offers";

type Props = { params: Promise<{ id: string }> };

export default async function EnchereRedirect({ params }: Props) {
  const { id } = await params;
  permanentRedirect(publicOfferPath(id));
}
