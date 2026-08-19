import { NextRequest, NextResponse, after } from "next/server";
import { betaClosedJsonResponse, isBetaModeFromRequest } from "@/lib/beta";
import {
  verifyBanAddress,
  banFeatureToStoredAddress,
} from "@/lib/ban-address";
import { validateClientAddress } from "@/lib/client-address";
import {
  DEFAULT_AUCTION_DURATION_HOURS,
  validateAuctionDurationHours,
} from "@/lib/auction-duration";
import {
  validateDescription,
  validatePhotoFiles,
  validatePreviousQuotePair,
  validateRequestedWorkStartDate,
} from "@/lib/demandes-validation";
import { getClientSession } from "@/lib/client-auth";
import { validateWorkRequestNafSelection } from "@/lib/naf-codes";
import { validatePricingSelection } from "@/lib/pricing-tiers";
import { normalizeSiret, verifyWithRegistry } from "@/lib/rcs";
import {
  formatFrenchPhoneDisplay,
  normalizeFrenchMobile,
} from "@/lib/phone-format";
import { parseMaxContactArtisans } from "@/lib/contact-slots";
import { parseMinGoogleRating } from "@/lib/google-rating";
import { clientPhoneIsVerified } from "@/lib/phone-verification";
import {
  addWorkRequest,
  consumeGuestPhoneVerification,
  getClientById,
  isGuestPhoneVerified,
  linkOrphanWorkRequests,
  setWorkRequestPhotos,
  setWorkRequestPreviousQuote,
} from "@/lib/store";
import type { ClientKind } from "@/lib/store-types";
import { parseClientKind, parseWorkScope } from "@/lib/copropriete";
import { savePreviousQuoteProof, saveRequestPhotos } from "@/lib/uploads";
import { notifyAdminNewWorkRequest } from "@/lib/notify";

export async function POST(request: NextRequest) {
  if (isBetaModeFromRequest(request)) return betaClosedJsonResponse();

  try {
    const session = await getClientSession();
    const formData = await request.formData();

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phoneRaw = String(formData.get("phone") ?? "").trim();
    const clientKind: ClientKind = parseClientKind(formData.get("clientKind"));
    const workScope =
      clientKind === "copropriete"
        ? parseWorkScope(formData.get("workScope"))
        : undefined;
    const clientSiretRaw = String(formData.get("clientSiret") ?? "").trim();
    const companyNameRaw = String(formData.get("companyName") ?? "").trim();
    const addressLine = String(formData.get("addressLine") ?? "").trim();
    const addressLine2 = String(formData.get("addressLine2") ?? "").trim();
    const postalCode = String(formData.get("postalCode") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const banAddressId = String(formData.get("banAddressId") ?? "").trim();
    const requestedWorkStartDate = String(
      formData.get("requestedWorkStartDate") ?? ""
    ).trim();
    const category = String(formData.get("category") ?? "Autre").trim();
    const nafCodesRaw = formData
      .getAll("nafCodes")
      .map((v) => String(v).trim())
      .filter(Boolean);
    const pricingTierRaw = String(formData.get("pricingTier") ?? "").trim();
    const workOptionIdRaw = String(formData.get("workOptionId") ?? "").trim();
    const workOptionOtherDescriptionRaw = String(
      formData.get("workOptionOtherDescription") ?? ""
    ).trim();
    const description = String(formData.get("description") ?? "");
    const durationRaw = String(
      formData.get("auctionDurationHours") ??
        formData.get("auctionDurationDays") ??
        DEFAULT_AUCTION_DURATION_HOURS
    );
    const preferEstablishedRaw = String(
      formData.get("preferEstablishedCompany") ?? "false"
    ).toLowerCase();
    const preferEstablishedCompany =
      preferEstablishedRaw === "true" ||
      preferEstablishedRaw === "1" ||
      preferEstablishedRaw === "on";
    const maxContactArtisans = parseMaxContactArtisans(
      formData.get("maxContactArtisans")
    );
    if (maxContactArtisans == null) {
      return NextResponse.json(
        {
          error:
            "Indiquez combien d’artisans peuvent vous contacter (de 1 à 5).",
        },
        { status: 400 }
      );
    }
    const minGoogleRating = parseMinGoogleRating(
      formData.get("minGoogleRating")
    );
    // Mise en contact autorisée via acceptation CG (plus d’opt-in SMS séparé).
    const acceptContactTermsRaw = String(
      formData.get("acceptContactTerms") ?? ""
    ).toLowerCase();
    const acceptContactTerms =
      acceptContactTermsRaw === "true" ||
      acceptContactTermsRaw === "1" ||
      acceptContactTermsRaw === "on";
    const previousQuoteAmountRaw = String(formData.get("previousQuoteAmount") ?? "").trim();
    const previousQuoteNote = String(formData.get("previousQuoteNote") ?? "").trim();

    const photoEntries = formData.getAll("photos");
    const photos = photoEntries.filter(
      (f): f is File => f instanceof File && f.size > 0
    );
    const proofEntry = formData.get("previousQuoteProof");
    const previousQuoteProof =
      proofEntry instanceof File && proofEntry.size > 0 ? proofEntry : null;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phoneRaw ||
      !addressLine ||
      !postalCode ||
      !city ||
      !banAddressId ||
      !requestedWorkStartDate
    ) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis." },
        { status: 400 }
      );
    }

    if (!acceptContactTerms) {
      return NextResponse.json(
        {
          error:
            "Vous devez accepter les CGU / CGV pour autoriser la mise en contact avec les artisans.",
        },
        { status: 400 }
      );
    }

    const phoneNormalized = normalizeFrenchMobile(phoneRaw);
    if (!phoneNormalized) {
      return NextResponse.json(
        {
          error:
            "Indiquez un mobile français valide (06 ou 07), ex. 06 12 34 56 78.",
        },
        { status: 400 }
      );
    }
    const phone = formatFrenchPhoneDisplay(phoneNormalized);

    let companyName: string | undefined;
    let clientSiret: string | undefined;
    let clientSiren: string | undefined;

    if (clientKind === "company") {
      const registry = await verifyWithRegistry(normalizeSiret(clientSiretRaw));
      if (!registry.valid) {
        return NextResponse.json(
          {
            error:
              registry.error ??
              "SIRET invalide ou entreprise inactive. Vérification SIRENE requise.",
          },
          { status: 400 }
        );
      }
      companyName = registry.companyName ?? companyNameRaw;
      clientSiret = registry.siret;
      clientSiren = registry.siren;
      if (!companyName) {
        return NextResponse.json(
          { error: "Raison sociale introuvable pour ce SIRET." },
          { status: 400 }
        );
      }
    }

    if (clientKind === "copropriete" && !workScope) {
      return NextResponse.json(
        {
          error:
            "Indiquez si les travaux concernent les parties communes ou un lot privatif.",
        },
        { status: 400 }
      );
    }

    const addressError = validateClientAddress({
      addressLine,
      addressLine2,
      postalCode,
      city,
    });
    if (addressError) {
      return NextResponse.json({ error: addressError }, { status: 400 });
    }

    // Compat : anciens clients envoyaient des jours ; si valeur ≤ 90 et hors options heures, traiter comme jours.
    let durationHours = Number(durationRaw);
    const hoursError = validateAuctionDurationHours(durationHours);
    if (hoursError) {
      const asDays = Number(durationRaw);
      if (
        Number.isInteger(asDays) &&
        asDays >= 1 &&
        asDays <= 90 &&
        !Number.isNaN(asDays)
      ) {
        durationHours = asDays * 24;
      }
    }
    const durationError = validateAuctionDurationHours(durationHours);
    if (durationError) {
      return NextResponse.json({ error: durationError }, { status: 400 });
    }
    const auctionDurationHours = durationHours;

    const startDateError = validateRequestedWorkStartDate(
      requestedWorkStartDate,
      auctionDurationHours
    );
    if (startDateError) {
      return NextResponse.json({ error: startDateError }, { status: 400 });
    }

    const banVerification = await verifyBanAddress({
      addressLine,
      postalCode,
      city,
      banAddressId,
    });
    if (!banVerification.valid || !banVerification.feature) {
      return NextResponse.json(
        { error: banVerification.error ?? "Adresse non confirmée par la BAN." },
        { status: 400 }
      );
    }

    const verifiedAddress = banFeatureToStoredAddress(banVerification.feature);
    const department = verifiedAddress.department;

    const descriptionError = validateDescription(description);
    if (descriptionError) {
      return NextResponse.json({ error: descriptionError }, { status: 400 });
    }

    const nafCheck = validateWorkRequestNafSelection(category, nafCodesRaw);
    if (!nafCheck.ok) {
      return NextResponse.json({ error: nafCheck.error }, { status: 400 });
    }

    const pricingCheck = validatePricingSelection({
      pricingTier: pricingTierRaw,
      workOptionId: workOptionIdRaw || undefined,
      workOptionOtherDescription: workOptionOtherDescriptionRaw || undefined,
      nafCodes: nafCheck.nafCodes,
    });
    if (!pricingCheck.ok) {
      return NextResponse.json({ error: pricingCheck.error }, { status: 400 });
    }

    const photosError = validatePhotoFiles(photos);
    if (photosError) {
      return NextResponse.json({ error: photosError }, { status: 400 });
    }

    const previousQuoteError = validatePreviousQuotePair(
      previousQuoteAmountRaw,
      previousQuoteProof
    );
    if (previousQuoteError) {
      return NextResponse.json({ error: previousQuoteError }, { status: 400 });
    }

    let clientId: string | undefined;
    let phoneVerifiedAt: string | undefined;
    let guest = false;

    if (session) {
      const existing = await getClientById(session.clientId);
      if (!existing) {
        return NextResponse.json(
          { error: "Session invalide. Reconnectez-vous." },
          { status: 401 }
        );
      }
      if (existing.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          {
            error:
              "Utilisez l'email de votre compte connecté pour créer une demande.",
          },
          { status: 400 }
        );
      }
      if (!clientPhoneIsVerified(existing, phoneNormalized)) {
        return NextResponse.json(
          {
            error:
              "Vérifiez votre mobile par SMS avant d'envoyer la demande (bouton « Recevoir un code »).",
          },
          { status: 400 }
        );
      }
      clientId = existing.id;
      phoneVerifiedAt = existing.phoneVerifiedAt;
    } else {
      const guestOk = await isGuestPhoneVerified(phoneNormalized);
      if (!guestOk) {
        return NextResponse.json(
          {
            error:
              "Vérifiez votre mobile par SMS avant d'envoyer la demande (bouton « Recevoir un code »).",
          },
          { status: 400 }
        );
      }
      guest = true;
      phoneVerifiedAt = new Date().toISOString();
    }

    const entry = await addWorkRequest({
      firstName,
      lastName,
      email,
      phone,
      phoneVerifiedAt,
      clientId,
      clientKind,
      companyName,
      clientSiret,
      workScope,
      addressLine: verifiedAddress.addressLine,
      addressLine2: addressLine2 || undefined,
      postalCode: verifiedAddress.postalCode,
      city: verifiedAddress.city,
      department,
      banAddressId: verifiedAddress.banAddressId,
      latitude: verifiedAddress.latitude,
      longitude: verifiedAddress.longitude,
      addressVerifiedAt: new Date().toISOString(),
      requestedWorkStartDate,
      category,
      nafCodes: nafCheck.nafCodes,
      pricingTier: pricingCheck.pricingTier,
      workOptionId: pricingCheck.workOptionId,
      workOptionOtherDescription: pricingCheck.workOptionOtherDescription,
      description: description.trim(),
      auctionDurationHours,
      auctionDurationDays: Math.max(1, Math.round(auctionDurationHours / 24)),
      maxContactArtisans,
      preferEstablishedCompany,
      minGoogleRating,
      requireActiveCompany: true,
      requireValidInsurances: true,
      smsContactAlertsEnabled: true,
      startPriceMode: "unspecified",
      photos: [],
    });

    if (clientId) {
      await linkOrphanWorkRequests(clientId, email);
    } else {
      await consumeGuestPhoneVerification(phoneNormalized);
    }

    const photoPaths = await saveRequestPhotos(entry.id, photos);
    await setWorkRequestPhotos(entry.id, photoPaths);

    if (previousQuoteAmountRaw && previousQuoteProof) {
      const proofUrl = await savePreviousQuoteProof(entry.id, previousQuoteProof);
      await setWorkRequestPreviousQuote(entry.id, {
        previousQuoteAmount: Number(previousQuoteAmountRaw),
        previousQuoteProofUrl: proofUrl,
        previousQuoteNote: previousQuoteNote || undefined,
      });
    }

    after(() =>
      notifyAdminNewWorkRequest(entry).catch((err) =>
        console.error("[notify] admin new request", err)
      )
    );

    return NextResponse.json(
      {
        success: true,
        id: entry.id,
        photoCount: photoPaths.length,
        guest,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

