/** Rutas de inteligencia comercial — solo operador gabi (cookie maestra). */
export const OPERATOR_INTEL_PREFIXES = [
  "/gabi",
  "/propuestas",
  "/estudios",
] as const;

/** Subrutas de corredor reservadas al operador (el hub /corredor es para asesores). */
export const OPERATOR_CORREDOR_PREFIXES = ["/corredor/investti"] as const;

const OPERATOR_INTEL_PUBLIC_PREFIXES = [
  "/propuestas/v/",
  "/estudios/v/",
] as const;

export function isOperatorIntelRoute(pathname: string): boolean {
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
