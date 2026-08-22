import Link from "next/link";
import { notFound } from "next/navigation";
import AdminListingEditor from "@/components/admin/AdminListingEditor";
import { getWorkRequestByAuctionId } from "@/lib/work-request-auctions";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditOffrePage({ params }: Props) {
  const { id } = await params;
  const request = await getWorkRequestByAuctionId(id);
  if (!request) notFound();

  return (
    <div>
      <Link
        href={`/admin/particuliers/encheres/${id}`}
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        ← Retour à l’offre
      </Link>
      <div className="mt-4">
        <AdminListingEditor
          request={request}
          backHref={`/admin/particuliers/encheres/${id}`}
        />
      </div>
    </div>
  );
}
