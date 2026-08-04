import { NextRequest, NextResponse } from "next/server";
import {
  verifyBanAddress,
  banFeatureToStoredAddress,
} from "@/lib/ban-address";
import { validateClientAddress } from "@/lib/client-address";
import {
  DEFAULT_AUCTION_DURATION_DAYS,
  validateAuctionDurationDays,
} from "@/lib/auction-duration";
import {
  validateDescription,
  validatePhotoFiles,
  validatePreviousQuotePair,
  validateRequestedWorkStartDate,
} from "@/lib/demandes-validation";
import { validatePassword } from "@/lib/password";
import { normalizeSiret, verifyWithRegistry } from "@/lib/rcs";
import {
  addWorkRequest,
  ensureClientAccount,
  linkOrphanWorkRequests,
  setWorkRequestPhotos,
  setWorkRequestPreviousQuote,
} from "@/lib/store";
import type { ClientKind } from "@/lib/store-types";
import { savePreviousQuoteProof, saveRequestPhotos } from "@/lib/uploads";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const clientKindRaw = String(formData.get("clientKind") ?? "individual").trim();
    const clientKind: ClientKind =
      clientKindRaw === "company" ? "company" : "individual";
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
    const description = String(formData.get("description") ?? "");
    const durationRaw = String(
      formData.get("auctionDurationDays") ?? DEFAULT_AUCTION_DURATION_DAYS
    );
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
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

    const addressError = validateClientAddress({
      addressLine,
      addressLine2,
      postalCode,
      city,
    });
    if (addressError) {
      return NextResponse.json({ error: addressError }, { status: 400 });
    }

    const startDateError = validateRequestedWorkStartDate(requestedWorkStartDate);
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

    const durationError = validateAuctionDurationDays(durationRaw);
    if (durationError) {
      return NextResponse.json({ error: durationError }, { status: 400 });
    }
    const auctionDurationDays = Number(durationRaw);

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    if (password !== passwordConfirm) {
      return NextResponse.json(
        { error: "Les mots de passe ne correspondent pas." },
        { status: 400 }
      );
    }

    const clientResult = await ensureClientAccount({
      email,
      password,
      firstName,
      lastName,
      kind: clientKind,
      companyName,
      siret: clientSiret,
      siren: clientSiren,
      companyVerified: clientKind === "company",
    });
    if ("error" in clientResult) {
      return NextResponse.json({ error: clientResult.error }, { status: 400 });
    }
    const { client } = clientResult;

    const entry = await addWorkRequest({
      firstName,
      lastName,
      email,
      clientId: client.id,
      clientKind,
      companyName,
      clientSiret,
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
      description: description.trim(),
      auctionDurationDays,
      photos: [],
    });

    await linkOrphanWorkRequests(client.id, email);

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

    return NextResponse.json(
      { success: true, id: entry.id, photoCount: photoPaths.length },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

