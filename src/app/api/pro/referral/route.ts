import { NextRequest, NextResponse } from "next/server";
import { buildReferralUrl } from "@/lib/referral";
import { getProSession } from "@/lib/pro-auth";
import { getSiteOrigin } from "@/lib/share";
import {
  applyReferralCodeToPro,
  ensureProReferralCode,
  getApprovedProById,
  getProReferralStats,
} from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const pro = await getApprovedProById(session.proId);
  if (!pro) {
    return NextResponse.json({ error: "Compte non approuvé." }, { status: 403 });
  }

  await ensureProReferralCode(session.proId);
  const stats = await getProReferralStats(session.proId);
  const origin = getSiteOrigin(request);

  return NextResponse.json({
    ...stats,
    referralLink: stats.referralCode
      ? buildReferralUrl(origin, stats.referralCode)
      : null,
  });
}

export async function POST(request: NextRequest) {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const pro = await getApprovedProById(session.proId);
  if (!pro) {
    return NextResponse.json({ error: "Compte non approuvé." }, { status: 403 });
  }

  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const result = await applyReferralCodeToPro(session.proId, String(body.code ?? ""));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const stats = await getProReferralStats(session.proId);
  const origin = getSiteOrigin(request);

  return NextResponse.json({
    success: true,
    message: `Code validé — parrain : ${result.referrer.companyName}.`,
    referrer: result.referrer,
    ...stats,
    referralLink: stats.referralCode
      ? buildReferralUrl(origin, stats.referralCode)
      : null,
  });
}
