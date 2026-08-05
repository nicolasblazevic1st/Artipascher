import nodemailer from "nodemailer";
import { absoluteUrl } from "./share";
import type { PasswordResetUserType } from "./store-types";

/** Couleurs du site (globals.css) pour les emails HTML. */
const BRAND = {
  teal: "#0d9488",
  tealDark: "#0f766e",
  tealDeep: "#042f2e",
  amber: "#f59e0b",
  amberHover: "#d97706",
  violet: "#7c3aed",
  violetDark: "#6d28d9",
  slate: "#334155",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#fafaf9",
  white: "#ffffff",
} as const;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? "587");
  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  };
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? "noreply@artipascher.fr";
}

function getResetPath(userType: PasswordResetUserType): string {
  return userType === "client"
    ? "/particulier/espace/reinitialiser-mot-de-passe"
    : "/pro/reinitialiser-mot-de-passe";
}

function getVerifyPath(userType: PasswordResetUserType): string {
  return userType === "client"
    ? "/particulier/espace/verifier-email"
    : "/pro/verifier-email";
}

function getAccountLabel(userType: PasswordResetUserType): string {
  return userType === "client" ? "particulier" : "professionnel";
}

function getPalette(userType: PasswordResetUserType) {
  if (userType === "client") {
    return {
      header: BRAND.violet,
      headerText: BRAND.white,
      cta: BRAND.amber,
      ctaText: BRAND.white,
      accent: BRAND.violet,
      badge: "Espace particulier",
    };
  }
  return {
    header: BRAND.teal,
    headerText: BRAND.white,
    cta: BRAND.amber,
    ctaText: BRAND.white,
    accent: BRAND.tealDark,
    badge: "Espace professionnel",
  };
}

function brandedEmailHtml(params: {
  userType: PasswordResetUserType;
  title: string;
  intro: string;
  bodyLines: string[];
  ctaLabel: string;
  ctaUrl: string;
  footnote: string;
}): string {
  const palette = getPalette(params.userType);
  const bodyHtml = params.bodyLines
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${BRAND.slate};">${line}</p>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.white};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};">
          <tr>
            <td style="background:${palette.header};padding:28px 32px;text-align:left;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:rgba(255,255,255,0.85);">${palette.badge}</p>
              <p style="margin:0;font-size:22px;font-weight:700;color:${palette.headerText};">Artipascher</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${BRAND.tealDeep};">${params.title}</h1>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${BRAND.slate};">${params.intro}</p>
              ${bodyHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="border-radius:10px;background:${palette.cta};">
                    <a href="${params.ctaUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:${palette.ctaText};text-decoration:none;">${params.ctaLabel}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:${BRAND.muted};">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                <a href="${params.ctaUrl}" style="color:${palette.accent};word-break:break-all;">${params.ctaUrl}</a>
              </p>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${BRAND.muted};">${params.footnote}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid ${BRAND.border};">
              <p style="margin:0;font-size:12px;color:${BRAND.muted};">Artipascher · Nord 59 · Pas-de-Calais 62</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  userType: PasswordResetUserType
): Promise<void> {
  const resetUrl = absoluteUrl(`${getResetPath(userType)}?token=${encodeURIComponent(token)}`);
  const accountLabel = getAccountLabel(userType);
  const subject = "Réinitialisation de votre mot de passe Artipascher";
  const text = [
    "Bonjour,",
    "",
    `Vous avez demandé la réinitialisation du mot de passe de votre espace ${accountLabel} sur Artipascher.`,
    "",
    "Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe (valable 1 heure) :",
    resetUrl,
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    "",
    "L'équipe Artipascher",
  ].join("\n");

  const html = `
    <p>Bonjour,</p>
    <p>Vous avez demandé la réinitialisation du mot de passe de votre espace ${accountLabel} sur Artipascher.</p>
    <p><a href="${resetUrl}">Cliquez ici pour choisir un nouveau mot de passe</a> (lien valable 1 heure).</p>
    <p>Si le lien ne fonctionne pas, copiez cette adresse dans votre navigateur :<br>${resetUrl}</p>
    <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    <p>L'équipe Artipascher</p>
  `.trim();

  const smtp = getSmtpConfig();
  if (!smtp) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[email] Mot de passe oublié (${userType}) pour ${email}:`);
      console.info(resetUrl);
      return;
    }
    console.error("[email] SMTP non configuré — impossible d'envoyer l'email de réinitialisation.");
    return;
  }

  const transporter = nodemailer.createTransport(smtp);
  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject,
    text,
    html,
  });
}

async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const smtp = getSmtpConfig();
  if (!smtp) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[email] ${options.subject} → ${options.to}`);
      console.info(options.text);
      return;
    }
    console.error("[email] SMTP non configuré —", options.subject);
    return;
  }
  const transporter = nodemailer.createTransport(smtp);
  await transporter.sendMail({
    from: getFromAddress(),
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export async function sendEmailVerificationEmail(
  email: string,
  token: string,
  userType: PasswordResetUserType
): Promise<void> {
  const verifyUrl = absoluteUrl(
    `${getVerifyPath(userType)}?token=${encodeURIComponent(token)}`
  );
  const accountLabel = getAccountLabel(userType);
  const subject = "Confirmez votre adresse email — Artipascher";
  const text = [
    "Bonjour,",
    "",
    `Bienvenue sur Artipascher. Confirmez votre adresse email pour activer votre espace ${accountLabel}.`,
    "",
    "Cliquez sur le lien ci-dessous (valable 48 heures) :",
    verifyUrl,
    "",
    "Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.",
    "",
    "L'équipe Artipascher",
  ].join("\n");

  const html = brandedEmailHtml({
    userType,
    title: "Confirmez votre adresse email",
    intro: `Bienvenue sur Artipascher. Pour activer votre espace ${accountLabel}, validez votre adresse en un clic.`,
    bodyLines: [
      "Ce lien est valable <strong>48 heures</strong>.",
      "Sans confirmation, vous ne pourrez pas vous connecter à votre espace.",
    ],
    ctaLabel: "Vérifier mon email",
    ctaUrl: verifyUrl,
    footnote:
      "Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email.",
  });

  await sendMail({ to: email, subject, text, html });
}

export async function sendContactInterestEmailToClient(params: {
  clientEmail: string;
  clientFirstName: string;
  proCompanyName: string;
  proSiret: string;
  category: string;
  city: string;
  workRequestId: string;
}): Promise<void> {
  const url = absoluteUrl(`/particulier/espace/demandes/${params.workRequestId}`);
  const subject = "Un artisan souhaite vous contacter — Artipascher";
  const text = [
    `Bonjour ${params.clientFirstName},`,
    "",
    `L'entreprise ${params.proCompanyName} (SIRET ${params.proSiret}) souhaite vous contacter pour votre chantier ${params.category} à ${params.city}.`,
    "",
    "Connectez-vous à votre espace pour accepter ou refuser :",
    url,
    "",
    "Vous avez 48 heures pour répondre.",
    "",
    "L'équipe Artipascher",
  ].join("\n");
  const html = `
    <p>Bonjour ${params.clientFirstName},</p>
    <p>L'entreprise <strong>${params.proCompanyName}</strong> (SIRET ${params.proSiret}) souhaite vous contacter pour votre chantier <strong>${params.category}</strong> à ${params.city}.</p>
    <p><a href="${url}">Ouvrir mon espace pour accepter ou refuser</a></p>
    <p>Vous avez 48 heures pour répondre.</p>
    <p>L'équipe Artipascher</p>
  `.trim();
  await sendMail({ to: params.clientEmail, subject, text, html });
}

export async function sendContactDecisionEmailToPro(params: {
  proEmail: string;
  proCompanyName: string;
  decision: "accepted" | "refused" | "expired";
  category: string;
  city: string;
  auctionId: string;
}): Promise<void> {
  const auctionUrl = absoluteUrl(`/encheres/${params.auctionId}`);
  const labels = {
    accepted: "a accepté votre demande de contact",
    refused: "a décliné votre demande de contact",
    expired: "n'a pas répondu à temps (demande expirée)",
  } as const;
  const subject = `Demande de contact ${params.decision === "accepted" ? "acceptée" : params.decision === "refused" ? "refusée" : "expirée"} — Artipascher`;
  const text = [
    `Bonjour ${params.proCompanyName},`,
    "",
    `Le client ${labels[params.decision]} pour le chantier ${params.category} à ${params.city}.`,
    params.decision === "accepted"
      ? `Vous pouvez maintenant débloquer les coordonnées : ${auctionUrl}`
      : "",
    "",
    "L'équipe Artipascher",
  ]
    .filter(Boolean)
    .join("\n");
  await sendMail({
    to: params.proEmail,
    subject,
    text,
    html: `<p>${text.replace(/\n/g, "<br>")}</p>`,
  });
}
