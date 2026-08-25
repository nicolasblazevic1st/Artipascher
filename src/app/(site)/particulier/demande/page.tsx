import { permanentRedirect } from "next/navigation";
import { WORK_REQUEST_FORM_PATH } from "@/lib/work-request-form-path";

function firstString(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === "string" && value) return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return undefined;
}

/** Ancien URL Ads / liens internes → formulaire unique `/travaux`. */
export default async function LegacyDemandeRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const v = firstString(value);
    if (v) qs.set(key, v);
  }
  const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
  permanentRedirect(`${WORK_REQUEST_FORM_PATH}${suffix}`);
}
