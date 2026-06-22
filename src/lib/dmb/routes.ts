export const DMB_PUBLIC_PREFIXES = ["/dmb/landing"] as const;

export function isDmbPublicRoute(pathname: string): boolean {
  return DMB_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Rutas de contenido DMB (consultoría, estudios, corredor). */
export const DMB_CONTENT_PREFIXES = [
  "/dmb",
  "/propuestas",
  "/estudios",
  "/corredor",
] as const;

/** Share links públicos (sin login operador). */
export const DMB_PUBLIC_SHARE_PREFIXES = ["/propuestas/v/", "/estudios/v/"] as const;

export function isDmbPublicShareRoute(pathname: string): boolean {
  return DMB_PUBLIC_SHARE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isDmbContentRoute(pathname: string): boolean {
  if (isDmbPublicRoute(pathname)) {
    return false;
  }

  if (isDmbPublicShareRoute(pathname)) {
    return true;
  }

  return DMB_CONTENT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Rutas que solo pertenecen a gabi (operación comercial). */
export const GABI_ONLY_PREFIXES = [
  "/recorrido",
  "/cotizador",
  "/mis-leads",
  "/dashboard",
  "/disponibilidad",
  "/desarrollos",
  "/investti",
  "/portal",
  "/operador",
] as const;

export function isGabiOnlyRoute(pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return !pathname.startsWith("/admin/dmb");
  }
  return GABI_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const DMB_BRAND_COOKIE = "gabi-brand";

export function dmbHubPath(): string {
  return "/dmb";
}

export function dmbOperadorLoginPath(): string {
  return "/operador";
}
