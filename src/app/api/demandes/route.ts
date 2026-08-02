import { NextRequest, NextResponse } from "next/server";
import {
  validateDescription,
  validatePhotoFiles,
} from "@/lib/demandes-validation";
import {
  DEFAULT_AUCTION_DURATION_DAYS,
  validateAuctionDurationDays,
} from "@/lib/auction-duration";
import { validatePassword } from "@/lib/password";
import { addWorkRequest, ensureClientAccount, linkOrphanWorkRequests, setWorkRequestPhotos } from "@/lib/store";
import { saveRequestPhotos } from "@/lib/uploads";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const category = String(formData.get("category") ?? "Autre").trim();
    const description = String(formData.get("description") ?? "");
    const budgetRaw = String(formData.get("budget") ?? "");
    const durationRaw = String(
      formData.get("auctionDurationDays") ?? DEFAULT_AUCTION_DURATION_DAYS
    );
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

    const photoEntries = formData.getAll("photos");
    const photos = photoEntries.filter(
      (f): f is File => f instanceof File && f.size > 0
    );

    if (!firstName || !lastName || !email || !city || !budgetRaw) {
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

    const budget = Number(budgetRaw);
    if (Number.isNaN(budget) || budget < 100) {
      return NextResponse.json(
        { error: "Budget minimum de 100 € requis." },
        { status: 400 }
      );
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
      budget,
      auctionDurationDays,
      photos: [],
    });

    await linkOrphanWorkRequests(client.id, email);

    const photoPaths = await saveRequestPhotos(entry.id, photos);
    await setWorkRequestPhotos(entry.id, photoPaths);

    return NextResponse.json(
      { success: true, id: entry.id, photoCount: photoPaths.length },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
