import { formatPublishedDate } from "@/lib/public-offers";

export default function PublishedDate({
  publishedAt,
  className = "",
}: {
  publishedAt?: string | null;
  className?: string;
}) {
  const label = formatPublishedDate(publishedAt);
  if (!label || !publishedAt) return null;

  return (
    <p className={`text-sm text-slate-500 ${className}`}>
      Publiée le{" "}
      <time dateTime={publishedAt} className="font-medium text-slate-700">
        {label}
      </time>
    </p>
  );
}
