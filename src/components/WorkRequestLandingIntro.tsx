export default function WorkRequestLandingIntro({
  heading,
  children,
  compact = false,
}: {
  heading: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <>
      <p className="inline-flex rounded-full bg-client-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-client-800">
        Formulaire à remplir
      </p>
      <h1
        className={`mt-3 font-bold text-slate-900 ${
          compact ? "text-2xl" : "text-3xl"
        }`}
      >
        {heading}
      </h1>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </>
  );
}
