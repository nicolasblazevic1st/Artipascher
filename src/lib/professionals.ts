import type { TradeCategory } from "./data";

/** Artisan inscrit et vérifié au registre du commerce (RCS). */
export interface VerifiedProfessional {
  id: string;
  companyName: string;
  siret: string;
  siren: string;
  city: string;
  department: "59" | "62";
  category: TradeCategory;
  rcsVerified: true;
  rcsVerifiedAt: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  professionalId: string;
  amount: number;
  createdAt: string;
}

export const VERIFIED_PROFESSIONALS: VerifiedProfessional[] = [
  {
    id: "pro-1",
    companyName: "Rénovation Lilloise SARL",
    siret: "55210055400013",
    siren: "552100554",
    city: "Lille",
    department: "59",
    category: "carrelage",
    rcsVerified: true,
    rcsVerifiedAt: "2026-01-15",
  },
  {
    id: "pro-2",
    companyName: "Parquet Nord EURL",
    siret: "44478651100039",
    siren: "444786511",
    city: "Roubaix",
    department: "59",
    category: "menuiserie",
    rcsVerified: true,
    rcsVerifiedAt: "2026-02-01",
  },
  {
    id: "pro-3",
    companyName: "Élec 59 SAS",
    siret: "81493695800017",
    siren: "814936958",
    city: "Valenciennes",
    department: "59",
    category: "electricite",
    rcsVerified: true,
    rcsVerifiedAt: "2026-01-20",
  },
  {
    id: "pro-4",
    companyName: "Isolation Hauts-de-France",
    siret: "53389389500014",
    siren: "533893895",
    city: "Lens",
    department: "62",
    category: "charpente",
    rcsVerified: true,
    rcsVerifiedAt: "2026-03-10",
  },
];

/** Seules les offres d'artisans vérifiés RCS sont enregistrées. */
export const VERIFIED_BIDS: Bid[] = [
  { id: "b1", auctionId: "1", professionalId: "pro-1", amount: 7800, createdAt: "2026-08-01T10:00:00" },
  { id: "b2", auctionId: "1", professionalId: "pro-1", amount: 7200, createdAt: "2026-08-02T14:30:00" },
  { id: "b3", auctionId: "2", professionalId: "pro-2", amount: 2900, createdAt: "2026-08-01T09:00:00" },
  { id: "b4", auctionId: "2", professionalId: "pro-2", amount: 2600, createdAt: "2026-08-02T11:00:00" },
  { id: "b5", auctionId: "4", professionalId: "pro-3", amount: 1700, createdAt: "2026-08-01T16:00:00" },
  { id: "b6", auctionId: "4", professionalId: "pro-3", amount: 1500, createdAt: "2026-08-02T08:00:00" },
  { id: "b7", auctionId: "6", professionalId: "pro-4", amount: 3900, createdAt: "2026-07-30T12:00:00" },
  { id: "b8", auctionId: "6", professionalId: "pro-4", amount: 3600, createdAt: "2026-08-01T18:00:00" },
];

export function getVerifiedProfessional(id: string): VerifiedProfessional | undefined {
  return VERIFIED_PROFESSIONALS.find((p) => p.id === id && p.rcsVerified);
}

export function getVerifiedBidsForAuction(auctionId: string) {
  return VERIFIED_BIDS.filter((bid) => {
    const pro = getVerifiedProfessional(bid.professionalId);
    return bid.auctionId === auctionId && pro !== undefined;
  })
    .map((bid) => ({
      ...bid,
      professional: getVerifiedProfessional(bid.professionalId)!,
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function maskSiret(siret: string): string {
  return `${siret.slice(0, 3)} *** *** ${siret.slice(-5)}`;
}
