/** Hostnames que sirven la marca DMB (mismo deploy Vercel que gabi). */
const DMB_HOSTS = new Set(["dmb.mx", "www.dmb.mx"]);

export const DMB_SITE_URL =
  process.env.NEXT_PUBLIC_DMB_SITE_URL?.replace(/\/$/, "") ?? "https://dmb.mx";

export const GABI_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://gabi.mx";

export function normalizeHostname(host: string): string {
  const bare = host.split(":")[0]?.toLowerCase() ?? "";
  return bare.startsWith("www.") ? bare.slice(4) : bare;
}

export function isDmbHostname(host: string): boolean {
  const normalized = normalizeHostname(host);
  if (DMB_HOSTS.has(normalized)) {
    return true;
  }
  if (process.env.NODE_ENV === "development" && normalized === "dmb.localhost") {
    return true;
  }
  return false;
}

export function isLocalDevHost(host: string): boolean {
  const normalized = normalizeHostname(host);
  return normalized === "localhost" || normalized === "127.0.0.1";
}

export function absoluteDmbUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${DMB_SITE_URL}${p}`;
}

export function absoluteGabiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${GABI_SITE_URL}${p}`;
}
