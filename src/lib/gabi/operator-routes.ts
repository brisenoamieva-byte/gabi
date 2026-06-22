/** Rutas de inteligencia comercial — operador (DMB / gabi). */
export const OPERATOR_INTEL_PREFIXES = [
  "/dmb",
  "/gabi",
  "/propuestas",
  "/estudios",
] as const;

/** Corredor completo en DMB (operador). Investti metraje sigue siendo ruta de estudio. */
export const OPERATOR_CORREDOR_PREFIXES = ["/corredor", "/corredor/investti"] as const;

const OPERATOR_INTEL_PUBLIC_PREFIXES = [
  "/propuestas/v/",
  "/estudios/v/",
] as const;

import { isDmbPublicRoute } from "@/lib/dmb/routes";

export function isOperatorIntelRoute(pathname: string): boolean {
  if (isDmbPublicRoute(pathname)) {
    return false;
  }

  if (OPERATOR_INTEL_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  if (
    OPERATOR_CORREDOR_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }

  return OPERATOR_INTEL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function operatorLoginRedirectUrl(requestUrl: string, pathname: string, search: string) {
  const next = `${pathname}${search}`;
  const url = new URL("/operador", requestUrl);
  url.searchParams.set("next", next);
  return url;
}
