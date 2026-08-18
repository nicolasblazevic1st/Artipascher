"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildFacebookShareUrl,
  buildLinkedInShareUrl,
  buildShareText,
  buildWhatsAppShareUrl,
  buildXShareUrl,
  getPublicSharePath,
} from "@/lib/share";

interface Props {
  shareToken: string;
  category: string;
  city: string;
  department: "59" | "62";
  startPrice?: number;
}

export default function ShareAuctionPanel({
  shareToken,
  category,
  city,
  department,
  startPrice,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const sharePath = getPublicSharePath(shareToken);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${sharePath}`
      : sharePath;
  const shareText = buildShareText({ category, city, department, startPrice });

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [shareUrl]);

  async function nativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: shareText,
        text: shareText,
        url: shareUrl,
      });
    } catch {
      /* annulé par l'utilisateur */
    }
  }

  const channels = [
    {
      label: "WhatsApp",
      href: buildWhatsAppShareUrl(shareText, shareUrl),
      className: "bg-[#25D366] hover:bg-[#1fb855]",
    },
    {
      label: "Facebook",
      href: buildFacebookShareUrl(shareUrl),
      className: "bg-[#1877F2] hover:bg-[#166fe0]",
    },
    {
      label: "LinkedIn",
      href: buildLinkedInShareUrl(shareUrl),
      className: "bg-[#0A66C2] hover:bg-[#0958a8]",
    },
    {
      label: "X",
      href: buildXShareUrl(shareText, shareUrl),
      className: "bg-slate-900 hover:bg-slate-800",
    },
  ];

  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50 p-5">
      <h2 className="text-lg font-semibold text-slate-900">Partager mon annonce</h2>
      <p className="mt-1 text-sm text-slate-600">
        Diffusez votre projet sur les réseaux sociaux pour attirer plus d&apos;artisans du Nord-Pas-de-Calais.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {channels.map((channel) => (
          <a
            key={channel.label}
            href={channel.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${channel.className}`}
          >
            {channel.label}
          </a>
        ))}
        {canNativeShare && (
          <button
            type="button"
            onClick={nativeShare}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Partager…
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          readOnly
          value={shareUrl}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          aria-label="Lien de partage"
        />
        <button
          type="button"
          onClick={copyLink}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {copied ? "Copié ✓" : "Copier le lien"}
        </button>
      </div>
    </section>
  );
}
