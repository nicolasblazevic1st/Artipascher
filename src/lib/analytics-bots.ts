import { normalizeStoredClientIp } from "@/lib/request-client";

/** Meta / Facebook crawler block seen hitting the lead form (57.141–57.149). */
const META_CRAWLER_V4: Array<[number, number]> = [
  [ipv4ToInt("57.141.0.0"), ipv4ToInt("57.149.255.255")],
];

const CRAWLER_UA =
  /facebookexternalhit|facebot|meta-externalagent|meta-externalads|meta-externalfetcher|meta-webindexer|meta-externalhits|googlebot|adsbot-google|mediapartners-google|bingbot|slurp|duckduckbot|yandexbot|baiduspider|semrushbot|ahrefsbot|dotbot|petalbot|bytespider|gptbot|claudebot|applebot|twitterbot|linkedinbot/i;

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return (
    ((parts[0] ?? 0) << 24 >>> 0) +
    ((parts[1] ?? 0) << 16) +
    ((parts[2] ?? 0) << 8) +
    (parts[3] ?? 0)
  );
}

export function isMetaCrawlerIp(raw: string | undefined | null): boolean {
  const ip = normalizeStoredClientIp(raw);
  if (!ip || ip.includes(":")) return false;
  const n = ipv4ToInt(ip);
  return META_CRAWLER_V4.some(([from, to]) => n >= from && n <= to);
}

export function isAnalyticsCrawler(input: {
  ip?: string | null;
  userAgent?: string | null;
}): boolean {
  if (isMetaCrawlerIp(input.ip)) return true;
  const ua = input.userAgent?.trim() ?? "";
  return ua.length > 0 && CRAWLER_UA.test(ua);
}
