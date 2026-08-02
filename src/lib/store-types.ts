import type { TradeCategory } from "./data";

export type AdminReviewStatus = "pending" | "approved" | "rejected";

export interface ProRegistration {
  id: string;
  companyName: string;
  siret: string;
  siren: string;
  email: string;
  phone: string;
  city: string;
  department: "59" | "62";
  category: TradeCategory;
  zone: string;
  rcsVerified: boolean;
  passwordHash: string;
  status: AdminReviewStatus;
  createdAt: string;
  reviewedAt?: string;
  adminNote?: string;
}

export interface WorkRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  department: "59" | "62";
  category: string;
  description: string;
  budget: number;
  photos: string[];
  status: AdminReviewStatus;
  createdAt: string;
  reviewedAt?: string;
  auctionId?: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  proId: string;
  companyName: string;
  amount: number;
  feeEur: number;
  createdAt: string;
  stripeSessionId?: string;
}

export interface ContactUnlock {
  id: string;
  proId: string;
  auctionId: string;
  amountEur: number;
  paidAt: string;
  stripeSessionId?: string;
}

export interface DataStore {
  proRegistrations: ProRegistration[];
  workRequests: WorkRequest[];
  contactUnlocks: ContactUnlock[];
  bids: Bid[];
}

export const EMPTY_STORE: DataStore = {
  proRegistrations: [],
  workRequests: [],
  contactUnlocks: [],
  bids: [],
};
