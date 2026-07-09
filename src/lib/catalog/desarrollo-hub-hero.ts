import {
  desarrolloSelectorLogoImageClass,
  desarrolloSelectorLogoShellClass,
  desarrolloSelectorLogoSrc,
} from "@/lib/catalog/desarrollo-selector-logo-shell";
import { DESARROLLO_HUB_HERO_IMAGES } from "@/lib/comercial/xperience-catalog-ids";
import {
  getInvesttiDesarrolloLogo,
  isInvesttiCatalogDesarrollo,
} from "@/lib/catalog/investti-desarrollos";
import { investtiDesarrolloLogoShellClass } from "@/lib/catalog/investti-desarrollo-logo-shell";

const LOGO_EXT = /\.(png|webp|svg)(\?|$)/i;

/** Hero tipo logo (contenedor con padding) vs foto wide (cover). */
export const isDesarrolloHubLogoHero = (desarrolloId: string, heroSrc: string): boolean => {
  if (desarrolloId in DESARROLLO_HUB_HERO_IMAGES) {
    return true;
  }
  if (desarrolloId === "canadas-la-porta") {
    return true;
  }
  if (heroSrc.includes("/propuestas/desarrollos-alianzas/")) {
    return true;
  }
  if (heroSrc.includes("/logos/") && !/\.jpe?g(\?|$)/i.test(heroSrc)) {
    return true;
  }
  return LOGO_EXT.test(heroSrc.split("?")[0] ?? heroSrc);
};

export const desarrolloHubHeroShellClass = (desarrolloId: string): string => {
  if (isInvesttiCatalogDesarrollo(desarrolloId)) {
    return investtiDesarrolloLogoShellClass(desarrolloId);
  }
  return desarrolloSelectorLogoShellClass(desarrolloId);
};

/** Padding generoso en la franja 16:10 del hub admin. */
export const desarrolloHubHeroPaddingClass = (desarrolloId: string): string => {
  switch (desarrolloId) {
    case "canadas-la-porta":
      return "p-5 sm:p-6 md:p-7";
    case "mision-la-gavia":
      return "p-6 sm:p-8 md:p-9";
    case "pasaje-alamos":
      return "p-5 sm:p-7 md:p-8";
    case "la-vista-residencial":
      return "p-4 sm:p-6 md:p-7";
    case "canadas-del-arroyo":
      return "p-4 sm:p-5 md:p-6";
    case "simate":
      return "p-4 sm:p-5 md:p-6";
    default:
      return "p-5 sm:p-6 md:p-7";
  }
};

export const desarrolloHubHeroImageClass = (desarrolloId: string): string => {
  const base = "max-h-full max-w-full object-contain object-center";
  const selector = desarrolloSelectorLogoImageClass(desarrolloId);
  if (selector.includes("scale-")) {
    return `${base} ${selector.split(" ").filter((c) => c.startsWith("scale-")).join(" ")}`;
  }
  return base;
};

/** Mejor fuente para mostrar logo completo en el hub (no recortar wide PNG). */
export const resolveDesarrolloHubHeroDisplaySrc = (
  desarrolloId: string,
  heroSrc: string,
  logo?: string | null,
): string => {
  if (!isDesarrolloHubLogoHero(desarrolloId, heroSrc)) {
    return heroSrc;
  }

  if (isInvesttiCatalogDesarrollo(desarrolloId)) {
    return getInvesttiDesarrolloLogo(desarrolloId);
  }

  return desarrolloSelectorLogoSrc(desarrolloId, logo) ?? heroSrc;
};
