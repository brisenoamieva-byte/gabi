/** Rutas de backoffice de consultoría DMB (no gabi). */
export const DMB_ADMIN = {
  hub: "/admin/dmb",
  propuestas: "/admin/dmb/propuestas",
  propuesta: (slug: string) => `/admin/dmb/propuestas/${slug}`,
  estudiosNubo: "/admin/dmb/estudios-nubo",
  corredor: "/admin/dmb/corredor",
  corredorDesarrollo: (id: string) => `/admin/dmb/corredor/${id}`,
} as const;

export function isDmbAdminRoute(pathname: string): boolean {
  return pathname === DMB_ADMIN.hub || pathname.startsWith(`${DMB_ADMIN.hub}/`);
}

/** Redirige rutas legacy `/admin/propuestas` → `/admin/dmb/propuestas`, etc. */
export function resolveLegacyDmbAdminRedirect(pathname: string): string | null {
  if (pathname === "/admin/propuestas" || pathname.startsWith("/admin/propuestas/")) {
    return pathname.replace("/admin/propuestas", DMB_ADMIN.propuestas);
  }
  if (pathname === "/admin/estudios-nubo" || pathname.startsWith("/admin/estudios-nubo/")) {
    return pathname.replace("/admin/estudios-nubo", DMB_ADMIN.estudiosNubo);
  }
  if (pathname === "/admin/corredor" || pathname.startsWith("/admin/corredor/")) {
    return pathname.replace("/admin/corredor", DMB_ADMIN.corredor);
  }
  return null;
}
