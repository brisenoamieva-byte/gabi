/** Convierte rutas de /public en URL absoluta (requerido por Google Maps Marker icons). */
export function resolvePublicAssetUrl(path: string): string {
  if (!path) {
    return path;
  }

  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${normalized}`;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return site ? `${site}${normalized}` : normalized;
}
