function GoogleMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.72.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

export { GoogleMark };

export function googleAuthHref(role: "client" | "pro", from?: string): string {
  const params = new URLSearchParams({ role });
  if (from) params.set("from", from);
  return `/api/auth/google?${params.toString()}`;
}

export default function GoogleSignInButton({
  href,
  label = "Continuer avec Google",
  onNavigate,
}: {
  href: string;
  label?: string;
  onNavigate?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={() => onNavigate?.()}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
    >
      <GoogleMark />
      {label}
    </a>
  );
}

export function GoogleAuthDivider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-slate-200" />
      </div>
      <p className="relative flex justify-center">
        <span className="bg-white px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
          ou
        </span>
      </p>
    </div>
  );
}

export const GOOGLE_AUTH_MESSAGES: Record<string, string> = {
  cancelled: "Connexion Google annulée.",
  invalid: "La session Google a expiré. Réessayez.",
  failed: "Impossible de joindre Google. Réessayez.",
  unverified: "Cet email Google n’est pas vérifié.",
  beta: "Les inscriptions sont fermées pour le moment. Si vous avez déjà un compte, utilisez email et mot de passe.",
  unavailable: "La connexion Google n’est pas encore activée sur ce site.",
};
