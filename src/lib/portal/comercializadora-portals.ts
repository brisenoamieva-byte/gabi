import { comercializadores } from "@/lib/data";
import type { PortalSession } from "@/lib/portal/session";

/** Sesión de portal para PIN de asesores (marca + slug). No incluye credenciales. */
export const resolveComercializadoraPortalSession = (
  slug: string,
): PortalSession | null => {
  const normalized = slug.trim().toLowerCase();
  const match = comercializadores.find((item) => item.slug === normalized);
  if (!match) {
    return null;
  }

  return {
    id: match.id,
    nombre: match.nombre,
    slug: match.slug,
    logo: match.logo,
    portalPath: match.portalPath.startsWith("/portal/")
      ? match.portalPath
      : `/portal/${match.slug}`,
    colorPrimary: match.colorPrimary,
    colorAccent: match.colorAccent,
  };
};

export const isComercializadoraPortalSlug = (slug: string): boolean =>
  Boolean(resolveComercializadoraPortalSession(slug));
