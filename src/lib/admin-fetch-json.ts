/**
 * Parse une réponse admin en JSON, avec message clair si le proxy
 * renvoie du HTML (504/502 timeout) au lieu de JSON.
 */
export async function readAdminJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  const contentType = res.headers.get("content-type") ?? "";

  if (!trimmed) {
    throw new Error(`Réponse vide (HTTP ${res.status}).`);
  }

  const looksHtml =
    contentType.includes("text/html") ||
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.startsWith("<HTML");

  if (looksHtml) {
    throw new Error(
      `Le serveur a renvoyé une page HTML (HTTP ${res.status}) au lieu de JSON — souvent un timeout proxy pendant une sync longue. La sync SIRENE tourne maintenant en arrière-plan : attendez puis rechargez la liste.`
    );
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      `Réponse non JSON (HTTP ${res.status}) : ${trimmed.slice(0, 140)}`
    );
  }
}
