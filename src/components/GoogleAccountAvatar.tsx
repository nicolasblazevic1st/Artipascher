"use client";

import { useState } from "react";
import { GoogleMark } from "@/components/GoogleSignInButton";

export function GoogleAccountAvatar({
  pictureUrl,
  name,
  size = 32,
  className = "",
}: {
  pictureUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const initial = (name.trim().charAt(0) || "G").toUpperCase();
  const badge = Math.max(12, Math.round(size * 0.4));
  const showPhoto = Boolean(pictureUrl) && !broken;

  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title="Connecté avec Google"
    >
      {showPhoto ? (
        // Google CDN — referrerPolicy évite un 403 sur lh3.googleusercontent.com
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pictureUrl ?? ""}
          alt=""
          width={size}
          height={size}
          className="h-full w-full rounded-full object-cover ring-1 ring-black/10"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 ring-1 ring-black/10"
          aria-hidden
        >
          {initial}
        </span>
      )}
      <span
        className="absolute flex items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/10"
        style={{
          width: badge,
          height: badge,
          right: -2,
          bottom: -2,
        }}
      >
        <GoogleMark className="h-[72%] w-[72%]" />
      </span>
    </span>
  );
}

export function GoogleConnectedLabel({
  pictureUrl,
  name,
  detail = "Connecté avec Google",
  size = 36,
}: {
  pictureUrl?: string | null;
  name: string;
  detail?: string;
  size?: number;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <GoogleAccountAvatar pictureUrl={pictureUrl} name={name} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">
          {name}
        </span>
        <span className="block text-xs text-slate-600">{detail}</span>
      </span>
    </span>
  );
}
