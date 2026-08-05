/** Libellé public anonymisé pour un concurrent (jamais le nom de société). */
export function anonymousArtisanLabel(artisanIndex: number): string {
  return `Artisan ${artisanIndex + 1}`;
}

export function formatAnonymousBidLabel(
  artisanIndex: number,
  offerNumber: number
): string {
  return `${anonymousArtisanLabel(artisanIndex)} · offre ${offerNumber}`;
}

export interface AnonymousBidAnnotation {
  /** Index 0-based de l'artisan (ordre d'apparition chronologique). */
  anonymousArtisanIndex: number;
  /** Rang de l'offre pour cet artisan sur le chantier (1, 2 ou 3). */
  offerNumber: number;
  /** Ex. « Artisan 2 · offre 1 » */
  anonymousLabel: string;
}

/**
 * Anonymise les offres : même artisan = même « Artisan N »,
 * avec le numéro d'offre (1/2/3) selon l'ordre chronologique.
 * Ne fuit pas le proId dans le résultat public — à appeler côté serveur.
 */
export function annotateAnonymousBids<
  T extends { id: string; proId: string; createdAt: string },
>(bids: T[]): Array<T & AnonymousBidAnnotation> {
  const chronological = [...bids].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const artisanIndexByPro = new Map<string, number>();
  const offerNumberByBidId = new Map<string, number>();
  const offerCountByPro = new Map<string, number>();

  for (const bid of chronological) {
    if (!artisanIndexByPro.has(bid.proId)) {
      artisanIndexByPro.set(bid.proId, artisanIndexByPro.size);
    }
    const next = (offerCountByPro.get(bid.proId) ?? 0) + 1;
    offerCountByPro.set(bid.proId, next);
    offerNumberByBidId.set(bid.id, next);
  }

  return bids.map((bid) => {
    const anonymousArtisanIndex = artisanIndexByPro.get(bid.proId) ?? 0;
    const offerNumber = offerNumberByBidId.get(bid.id) ?? 1;
    return {
      ...bid,
      anonymousArtisanIndex,
      offerNumber,
      anonymousLabel: formatAnonymousBidLabel(anonymousArtisanIndex, offerNumber),
    };
  });
}
