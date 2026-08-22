export const PUBLIC_OFFERS_PATH = "/offres";

export function publicOfferPath(id?: string): string {
  return id ? `${PUBLIC_OFFERS_PATH}/${id}` : PUBLIC_OFFERS_PATH;
}

export function formatPublishedDate(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function publishedAtForRequest(request: {
  reviewedAt?: string;
  createdAt?: string;
}): string | undefined {
  return request.reviewedAt ?? request.createdAt;
}
