import nodemailer from "nodemailer";
import { absoluteUrl } from "./share";
import type { PasswordResetUserType } from "./store-types";

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

function getAccountLabel(userType: PasswordResetUserType): string {
  return userType === "client" ? "particulier" : "professionnel";
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
