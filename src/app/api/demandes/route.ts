import { NextRequest, NextResponse } from "next/server";
import {
  validateDescription,
  validatePhotoFiles,
  validatePreviousQuotePair,
} from "@/lib/demandes-validation";
import {
  DEFAULT_AUCTION_DURATION_DAYS,
  validateAuctionDurationDays,
} from "@/lib/auction-duration";
import { validatePassword } from "@/lib/password";
import { addWorkRequest, ensureClientAccount, linkOrphanWorkRequests, setWorkRequestPhotos, setWorkRequestPreviousQuote } from "@/lib/store";
import { savePreviousQuoteProof, saveRequestPhotos } from "@/lib/uploads";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
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

    if (!firstName || !lastName || !email || !city) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis." },
        { status: 400 }
      );
    }

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
    });
    if ("error" in clientResult) {
      return NextResponse.json({ error: clientResult.error }, { status: 400 });
    }
    const { client } = clientResult;

    const dept =
      /^(62|pas-de-calais)/i.test(city) || city.includes("62") ? "62" : "59";

    const entry = await addWorkRequest({
      firstName,
      lastName,
      email,
      clientId: client.id,
      city,
      department: dept as "59" | "62",
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
