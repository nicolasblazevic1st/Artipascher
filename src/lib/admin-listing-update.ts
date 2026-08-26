import {
  computeAuctionEndsAt,
  resolveAuctionDurationHours,
  validateAuctionDurationHours,
} from "@/lib/auction-duration";
import {
  verifyBanAddress,
  banFeatureToStoredAddress,
} from "@/lib/ban-address";
import { validateClientAddress } from "@/lib/client-address";
import { parseMaxContactArtisans } from "@/lib/contact-slots";
import { parseClientKind, parseWorkScope } from "@/lib/copropriete";
import { validateDescription } from "@/lib/demandes-validation";
import { parseMinGoogleRating } from "@/lib/google-rating";
import { validateWorkRequestNafSelection } from "@/lib/naf-codes";
import {
  formatFrenchPhoneDisplay,
  normalizeFrenchPhone,
} from "@/lib/phone-format";
import { validatePricingSelection } from "@/lib/pricing-tiers";
import { normalizeSiret, verifyWithRegistry } from "@/lib/rcs";
import { createShareToken, isAuctionStillActive } from "@/lib/share";
import {
  countContactUnlocksForAuction,
  updateWorkRequest,
  type WorkRequestPatch,
} from "@/lib/store";
import type { ClientKind, WorkRequest } from "@/lib/store-types";
import { isWorkCategory } from "@/lib/work-categories";

export const ADMIN_LISTING_ACTIONS = [
  "unpublish",
  "republish",
  "end_now",
] as const;

export type AdminListingAction = (typeof ADMIN_LISTING_ACTIONS)[number];

export function isAdminListingAction(value: unknown): value is AdminListingAction {
  return (
    typeof value === "string" &&
    (ADMIN_LISTING_ACTIONS as readonly string[]).includes(value)
  );
}

export { listingEditorHref } from "@/lib/admin-listing-paths";

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim();
}

function parseOptionalIsoDate(value: unknown): string | null | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const t = new Date(String(value)).getTime();
  if (!Number.isFinite(t)) return "invalid";
  return new Date(t).toISOString();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function applyAdminListingUpdate(
  existing: WorkRequest,
  body: Record<string, unknown>
): Promise<
  { ok: true; request: WorkRequest } | { ok: false; error: string; status: number }
> {
  const actionRaw = body.action;
  const action = isAdminListingAction(actionRaw) ? actionRaw : undefined;
  if (actionRaw != null && actionRaw !== "" && !action) {
    return { ok: false, error: "Action de publication inconnue.", status: 400 };
  }

  const patch: WorkRequestPatch = {};
  const hasField = (key: string) =>
    Object.prototype.hasOwnProperty.call(body, key);

  if (hasField("firstName")) {
    const firstName = asTrimmedString(body.firstName);
    if (!firstName) {
      return { ok: false, error: "Le prénom est obligatoire.", status: 400 };
    }
    patch.firstName = firstName;
  }
  if (hasField("lastName")) {
    const lastName = asTrimmedString(body.lastName);
    if (!lastName) {
      return { ok: false, error: "Le nom est obligatoire.", status: 400 };
    }
    patch.lastName = lastName;
  }
  if (hasField("email")) {
    const email = asTrimmedString(body.email);
    if (!email || !isValidEmail(email)) {
      return { ok: false, error: "Indiquez un e-mail valide.", status: 400 };
    }
    patch.email = email;
  }
  if (hasField("phone")) {
    const phoneRaw = asTrimmedString(body.phone);
    if (!phoneRaw) {
      return { ok: false, error: "Le téléphone est obligatoire.", status: 400 };
    }
    const normalized = normalizeFrenchPhone(phoneRaw);
    if (!normalized) {
      return {
        ok: false,
        error: "Indiquez un numéro français valide (10 chiffres).",
        status: 400,
      };
    }
    patch.phone = formatFrenchPhoneDisplay(normalized);
  }

  if (hasField("clientKind") || hasField("workScope") || hasField("companyName") || hasField("clientSiret")) {
    const clientKind: ClientKind = hasField("clientKind")
      ? parseClientKind(body.clientKind)
      : existing.clientKind ?? "individual";
    patch.clientKind = clientKind;

    if (clientKind === "individual") {
      patch.companyName = null;
      patch.clientSiret = null;
      patch.workScope = null;
    } else if (clientKind === "copropriete") {
      const workScope = parseWorkScope(
        hasField("workScope") ? body.workScope : existing.workScope
      );
      if (!workScope) {
        return {
          ok: false,
          error:
            "Indiquez si les travaux concernent les parties communes ou un lot privatif.",
          status: 400,
        };
      }
      patch.workScope = workScope;
      patch.companyName = null;
      patch.clientSiret = null;
    } else {
      patch.workScope = null;
      const siretRaw = asTrimmedString(body.clientSiret) ?? existing.clientSiret ?? "";
      const companyNameRaw =
        asTrimmedString(body.companyName) ?? existing.companyName ?? "";
      const siretChanged =
        normalizeSiret(siretRaw) !== normalizeSiret(existing.clientSiret ?? "");
      if (siretRaw && siretChanged) {
        const registry = await verifyWithRegistry(normalizeSiret(siretRaw));
        if (!registry.valid) {
          return {
            ok: false,
            error:
              registry.error ??
              "SIRET invalide ou entreprise inactive.",
            status: 400,
          };
        }
        patch.clientSiret = registry.siret;
        patch.companyName = registry.companyName ?? companyNameRaw;
      } else {
        if (!companyNameRaw) {
          return {
            ok: false,
            error: "La raison sociale est obligatoire pour une entreprise.",
            status: 400,
          };
        }
        patch.companyName = companyNameRaw;
        patch.clientSiret = siretRaw || null;
      }
    }
  }

  if (hasField("description")) {
    const description = typeof body.description === "string" ? body.description : "";
    const descriptionError = validateDescription(description);
    if (descriptionError) {
      return { ok: false, error: descriptionError, status: 400 };
    }
    patch.description = description.trim();
  }

  if (hasField("category") || hasField("nafCodes") || hasField("workOptionId") || hasField("pricingTier") || hasField("workOptionOtherDescription")) {
    const category = asTrimmedString(body.category) ?? existing.category;
    if (!isWorkCategory(category) && category !== existing.category) {
      return { ok: false, error: "Catégorie de travaux invalide.", status: 400 };
    }
    patch.category = category;

    const nafRaw = Array.isArray(body.nafCodes)
      ? body.nafCodes.map((v) => String(v).trim()).filter(Boolean)
      : existing.nafCodes;
    const nafCheck = validateWorkRequestNafSelection(category, nafRaw);
    if (!nafCheck.ok) {
      return { ok: false, error: nafCheck.error, status: 400 };
    }
    patch.nafCodes = nafCheck.nafCodes;

    const workOptionId =
      hasField("workOptionId")
        ? asTrimmedString(body.workOptionId) || undefined
        : existing.workOptionId;
    const workOptionOtherDescription =
      hasField("workOptionOtherDescription")
        ? asTrimmedString(body.workOptionOtherDescription) || undefined
        : existing.workOptionOtherDescription;
    const pricingTierRaw =
      hasField("pricingTier")
        ? asTrimmedString(body.pricingTier)
        : existing.pricingTier;

    const pricingCheck = validatePricingSelection({
      pricingTier: pricingTierRaw,
      workOptionId,
      workOptionOtherDescription,
      nafCodes: nafCheck.nafCodes,
    });
    if (!pricingCheck.ok) {
      if (
        category === existing.category &&
        (workOptionId ?? existing.workOptionId) === existing.workOptionId
      ) {
        patch.pricingTier = existing.pricingTier;
        patch.workOptionId = existing.workOptionId ?? null;
        patch.workOptionOtherDescription =
          existing.workOptionOtherDescription ?? null;
      } else {
        return { ok: false, error: pricingCheck.error, status: 400 };
      }
    } else {
      patch.pricingTier = pricingCheck.pricingTier;
      patch.workOptionId = pricingCheck.workOptionId ?? null;
      patch.workOptionOtherDescription =
        pricingCheck.workOptionOtherDescription ?? null;
    }
  }

  if (hasField("requestedWorkStartDate")) {
    const raw = asTrimmedString(body.requestedWorkStartDate);
    if (!raw) {
      patch.requestedWorkStartDate = null;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return {
        ok: false,
        error: "Date de début de travaux invalide.",
        status: 400,
      };
    } else {
      patch.requestedWorkStartDate = raw;
    }
  }

  if (hasField("maxContactArtisans")) {
    const maxContactArtisans = parseMaxContactArtisans(body.maxContactArtisans);
    if (maxContactArtisans == null) {
      return {
        ok: false,
        error: "Le nombre d’artisans contactables doit être entre 1 et 5.",
        status: 400,
      };
    }
    if (existing.auctionId) {
      const unlocks = await countContactUnlocksForAuction(existing.auctionId);
      if (maxContactArtisans < unlocks) {
        return {
          ok: false,
          error: `Impossible de descendre sous ${unlocks} artisan${unlocks > 1 ? "s" : ""} déjà en contact.`,
          status: 400,
        };
      }
    }
    patch.maxContactArtisans = maxContactArtisans;
  }

  if (hasField("preferEstablishedCompany")) {
    const raw = body.preferEstablishedCompany;
    if (raw === true || raw === "true") patch.preferEstablishedCompany = true;
    else if (raw === false || raw === "false") patch.preferEstablishedCompany = false;
    else patch.preferEstablishedCompany = null;
  }

  if (hasField("minGoogleRating")) {
    const raw = body.minGoogleRating;
    if (raw === null || raw === "" || raw === "any") {
      patch.minGoogleRating = null;
    } else {
      patch.minGoogleRating = parseMinGoogleRating(raw) ?? null;
    }
  }

  if (hasField("requireRge")) {
    const raw = body.requireRge;
    if (raw === true || raw === "true") patch.requireRge = true;
    else patch.requireRge = null;
  }

  if (hasField("isTest")) {
    patch.isTest = body.isTest === true || body.isTest === "true";
  }

  if (hasField("adminNote")) {
    const note = asTrimmedString(body.adminNote);
    patch.adminNote = note || null;
  }

  if (hasField("addressLine") || hasField("banAddressId")) {
    const addressLine = asTrimmedString(body.addressLine) ?? "";
    const addressLine2 = asTrimmedString(body.addressLine2) ?? "";
    const postalCode = asTrimmedString(body.postalCode) ?? "";
    const city = asTrimmedString(body.city) ?? "";
    const banAddressId = asTrimmedString(body.banAddressId) ?? "";
    if (!addressLine || !postalCode || !city || !banAddressId) {
      return {
        ok: false,
        error: "Sélectionnez une adresse officielle (BAN) complète.",
        status: 400,
      };
    }
    const addressError = validateClientAddress({
      addressLine,
      addressLine2,
      postalCode,
      city,
    });
    if (addressError) {
      return { ok: false, error: addressError, status: 400 };
    }
    const banVerification = await verifyBanAddress({
      addressLine,
      postalCode,
      city,
      banAddressId,
    });
    if (!banVerification.valid || !banVerification.feature) {
      return {
        ok: false,
        error: banVerification.error ?? "Adresse non confirmée par la BAN.",
        status: 400,
      };
    }
    const verified = banFeatureToStoredAddress(banVerification.feature);
    patch.addressLine = verified.addressLine;
    patch.addressLine2 = addressLine2 || null;
    patch.postalCode = verified.postalCode;
    patch.city = verified.city;
    patch.department = verified.department;
    patch.banAddressId = verified.banAddressId;
    patch.latitude = verified.latitude;
    patch.longitude = verified.longitude;
    patch.addressVerifiedAt = new Date().toISOString();
  } else if (hasField("addressLine2")) {
    const addressLine2 = asTrimmedString(body.addressLine2);
    patch.addressLine2 = addressLine2 || null;
  }

  if (hasField("auctionDurationHours")) {
    const hours = Number(body.auctionDurationHours);
    if (hours !== existing.auctionDurationHours) {
      const hoursError = validateAuctionDurationHours(body.auctionDurationHours);
      if (hoursError) {
        return { ok: false, error: hoursError, status: 400 };
      }
    }
    if (!Number.isFinite(hours) || hours < 1) {
      return { ok: false, error: "Durée d'annonce invalide.", status: 400 };
    }
    patch.auctionDurationHours = Math.floor(hours);
  }

  if (hasField("reviewedAt")) {
    const parsed = parseOptionalIsoDate(body.reviewedAt);
    if (parsed === "invalid") {
      return { ok: false, error: "Date de publication invalide.", status: 400 };
    }
    if (parsed === null || parsed === undefined) {
      if (existing.status === "approved") {
        return {
          ok: false,
          error: "La date de publication est obligatoire pour une offre publiée.",
          status: 400,
        };
      }
    } else {
      patch.reviewedAt = parsed;
    }
  }

  if (hasField("auctionEndsAt")) {
    const parsed = parseOptionalIsoDate(body.auctionEndsAt);
    if (parsed === "invalid") {
      return { ok: false, error: "Date de fin d’annonce invalide.", status: 400 };
    }
    patch.auctionEndsAt = parsed;
  }

  if (body.recalculateEndsAt === true || body.recalculateEndsAt === "true") {
    const hours = resolveAuctionDurationHours({
      auctionDurationHours:
        patch.auctionDurationHours ?? existing.auctionDurationHours,
      auctionDurationDays: existing.auctionDurationDays,
    });
    patch.auctionEndsAt = computeAuctionEndsAt(new Date(), hours).toISOString();
  }

  if (action === "unpublish") {
    if (existing.status !== "approved" || !existing.auctionId) {
      return {
        ok: false,
        error: "Seule une annonce publiée peut être dépubliée.",
        status: 400,
      };
    }
    patch.unpublishedAt = new Date().toISOString();
  }

  if (action === "republish") {
    if (existing.status !== "approved") {
      return {
        ok: false,
        error: "Publiez d’abord la demande depuis Demandes travaux.",
        status: 400,
      };
    }
    patch.unpublishedAt = null;
    patch.auctionId = existing.auctionId ?? `auction-${existing.id}`;
    patch.shareToken = existing.shareToken ?? createShareToken();
    const nextEnds =
      typeof patch.auctionEndsAt === "string"
        ? patch.auctionEndsAt
        : existing.auctionEndsAt;
    if (!isAuctionStillActive(nextEnds)) {
      const hours = resolveAuctionDurationHours({
        auctionDurationHours:
          patch.auctionDurationHours ?? existing.auctionDurationHours,
        auctionDurationDays: existing.auctionDurationDays,
      });
      patch.auctionEndsAt = computeAuctionEndsAt(new Date(), hours).toISOString();
    }
  }

  if (action === "end_now") {
    if (existing.status !== "approved" || !existing.auctionId) {
      return {
        ok: false,
        error: "Seule une annonce publiée peut être terminée.",
        status: 400,
      };
    }
    patch.auctionEndsAt = new Date().toISOString();
    patch.unpublishedAt = null;
  }

  const updated = await updateWorkRequest(existing.id, patch);
  if (!updated) {
    return { ok: false, error: "Demande introuvable.", status: 404 };
  }
  return { ok: true, request: updated };
}
