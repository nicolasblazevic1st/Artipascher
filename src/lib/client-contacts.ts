import {
  DEFAULT_PRICING_TIER,
  unlockCreditsForTier,
  unlockPriceEurForTier,
} from "./pricing-tiers";

export interface ClientContact {
  auctionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Mobile vérifié par SMS à la création de la demande. */
  phoneVerified?: boolean;
  address: string;
  postalCode: string;
  companyName?: string;
  clientSiret?: string;
  clientKind?: "individual" | "company";
}

/** Données privées — jamais exposées sans paiement (solde) par un pro approuvé. */
export const CLIENT_CONTACTS: Record<string, ClientContact> = {
  "1": {
    auctionId: "1",
    firstName: "Marie",
    lastName: "Dupont",
    email: "marie.dupont@email.fr",
    phone: "06 12 34 56 78",
    address: "12 rue de la Barre",
    postalCode: "59000 Lille",
  },
  "2": {
    auctionId: "2",
    firstName: "Jean",
    lastName: "Martin",
    email: "jean.martin@email.fr",
    phone: "06 98 76 54 32",
    address: "45 avenue Jean-Jaurès",
    postalCode: "59100 Roubaix",
  },
  "3": {
    auctionId: "3",
    firstName: "Sophie",
    lastName: "Bernard",
    email: "s.bernard@email.fr",
    phone: "07 11 22 33 44",
    address: "8 rue du Moulin",
    postalCode: "59200 Tourcoing",
  },
  "4": {
    auctionId: "4",
    firstName: "Pierre",
    lastName: "Leroy",
    email: "p.leroy@email.fr",
    phone: "06 55 44 33 22",
    address: "3 place d'Armes",
    postalCode: "59300 Valenciennes",
  },
  "5": {
    auctionId: "5",
    firstName: "Claire",
    lastName: "Moreau",
    email: "claire.moreau@email.fr",
    phone: "07 66 77 88 99",
    address: "27 rue de Paris",
    postalCode: "59500 Douai",
  },
  "6": {
    auctionId: "6",
    firstName: "Thomas",
    lastName: "Petit",
    email: "t.petit@email.fr",
    phone: "06 22 33 44 55",
    address: "5 boulevard Basly",
    postalCode: "62300 Lens",
  },
};

export function getClientContact(auctionId: string): ClientContact | undefined {
  return CLIENT_CONTACTS[auctionId];
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "•••@•••.fr";
  return `${user.slice(0, 1)}•••@${domain}`;
}

export function maskPhone(_phone: string): string {
  return "06 •• •• •• ••";
}

export function maskName(first: string, last: string): string {
  return `${first.charAt(0)}. ${last.charAt(0)}***`;
}

/** @deprecated Préférer resolveUnlockPricing / unlockCreditsForTier. */
export const UNLOCK_CREDITS_COST = unlockCreditsForTier(DEFAULT_PRICING_TIER);
/** Montant TTC de référence (ticket élevé) si aucun ticket sur l’annonce. */
export const UNLOCK_PRICE_EUR = unlockPriceEurForTier(DEFAULT_PRICING_TIER);
