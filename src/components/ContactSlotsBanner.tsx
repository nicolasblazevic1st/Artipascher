import {
  formatAcceptedArtisanSlots,
  isAcceptSlotsFull,
  isContactSlotsBannerEnabled,
  MAX_ACCEPTED_ARTISANS_PER_AUCTION,
  remainingAcceptSlots,
} from "@/lib/contact-slots";

type Tone = "available" | "low" | "full";

function toneFor(remaining: number, max: number): Tone {
  if (remaining <= 0) return "full";
  if (remaining <= Math.max(1, Math.ceil(max / 5))) return "low";
  return "available";
}

const TONE_CLASS: Record<Tone, string> = {
  available: "border-emerald-300 bg-emerald-50 text-emerald-950",
  low: "border-amber-300 bg-amber-50 text-amber-950",
  full: "border-slate-300 bg-slate-100 text-slate-800",
};

/**
 * Bandeau visible : places de contact encore disponibles sur une annonce.
 * Désactivable via `CONTACT_SLOTS_BANNER_ENABLED` ou `NEXT_PUBLIC_CONTACT_SLOTS_BANNER=false`.
 */
export default function ContactSlotsBanner({
  accepted,
  max = MAX_ACCEPTED_ARTISANS_PER_AUCTION,
  compact = false,
  className = "",
}: {
  accepted: number;
  max?: number;
  /** Version plus courte pour les cartes liste. */
  compact?: boolean;
  className?: string;
}) {
  if (!isContactSlotsBannerEnabled()) return null;

  const safeMax = max > 0 ? max : MAX_ACCEPTED_ARTISANS_PER_AUCTION;
  const remaining = remainingAcceptSlots(accepted, safeMax);
  const full = isAcceptSlotsFull(accepted, safeMax);
  const tone = toneFor(remaining, safeMax);
  const ratio = formatAcceptedArtisanSlots(accepted, safeMax);

  const title = full
    ? "Plus de place de contact"
    : remaining === 1
      ? "1 place de contact encore disponible"
      : `${remaining} places de contact encore disponibles`;

  const detail = full
    ? `Le client a déjà accepté ${safeMax} artisans (${ratio}).`
    : `Le client peut encore accepter ${remaining} artisan${remaining > 1 ? "s" : ""} (${ratio} acceptés).`;

  return (
    <div
      role="status"
      className={`rounded-xl border-2 px-3 py-2.5 sm:px-4 sm:py-3 ${TONE_CLASS[tone]} ${className}`}
    >
      <p
        className={`font-semibold leading-snug ${
          compact ? "text-sm" : "text-sm sm:text-base"
        }`}
      >
        {title}
      </p>
      {!compact && (
        <p className="mt-0.5 text-xs sm:text-sm opacity-90">{detail}</p>
      )}
      {compact && (
        <p className="mt-0.5 text-xs tabular-nums opacity-90">
          {ratio} artisans acceptés
        </p>
      )}
    </div>
  );
}
