import Link from "next/link";
import { notFound } from "next/navigation";
import AdminListingEditor from "@/components/admin/AdminListingEditor";
import { getWorkRequestById } from "@/lib/store";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditDemandePage({ params }: Props) {
  const { id } = await params;
  const request = await getWorkRequestById(id);
  if (!request) notFound();

  const backHref = request.auctionId
    ? `/admin/particuliers/encheres/${request.auctionId}`
    : "/admin/particuliers/demandes";

  return (
    <div>
      <Link
        href={backHref}
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        ← Retour
      </Link>
      <div className="mt-4">
        <AdminListingEditor request={request} backHref={backHref} />
      </div>
    </div>
  );
}
