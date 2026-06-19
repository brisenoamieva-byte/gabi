import {
  isInvesttiCatalogDesarrollo,
  type InvesttiCatalogDesarrolloId,
} from "@/lib/catalog/investti-desarrollos";
import { investtiDesarrolloLogoShellClass } from "@/lib/catalog/investti-desarrollo-logo-shell";

/** Contenedor thumb del selector — misma proporción en todos los desarrollos. */
export const DESARROLLO_SELECTOR_LOGO_THUMB_CLASS =
  "h-12 w-[calc(3rem*872/566)] rounded-lg sm:h-14 sm:w-[calc(3.5rem*872/566)]";

const BBR_SELECTOR_LOGO_SHELL: Record<string, string> = {
  "la-vista-residencial":
    "border-slate-200/90 bg-white shadow-[inset_0_1px_0_rgba(15,23,42,0.04)]",
  "pasaje-alamos":
    "border-[#242E38]/15 bg-white shadow-[inset_0_1px_0_rgba(15,23,42,0.04)]",
  "mision-la-gavia":
    "border-[#14453D]/20 bg-white shadow-[inset_0_1px_0_rgba(15,23,42,0.04)]",
};

/** Logo optimizado para celdas compactas del selector (sin tagline). */
export const DESARROLLO_SELECTOR_LOGO_ASSET: Partial<Record<string, string>> = {
  "mision-la-gavia": "/logos/mision-la-gavia-selector.png",
};

export function desarrolloSelectorLogoShellClass(desarrolloId: string): string {
  if (isInvesttiCatalogDesarrollo(desarrolloId)) {
    return investtiDesarrolloLogoShellClass(desarrolloId as InvesttiCatalogDesarrolloId);
  }
  return (
    BBR_SELECTOR_LOGO_SHELL[desarrolloId] ??
    "border-slate-200/90 bg-white shadow-[inset_0_1px_0_rgba(15,23,42,0.04)]"
  );
}

export function desarrolloSelectorLogoSrc(
  desarrolloId: string,
  logo?: string | null,
): string | undefined {
  return DESARROLLO_SELECTOR_LOGO_ASSET[desarrolloId] ?? logo ?? undefined;
}

export function desarrolloSelectorLogoPaddingClass(desarrolloId: string): string {
  if (desarrolloId === "canadas-la-porta") {
    return "p-0";
  }
  if (desarrolloId === "mision-la-gavia") {
    return "px-1 py-0.5";
  }
  if (desarrolloId === "simate") {
    return "px-1.5 py-1";
  }
  return "px-2 py-1.5";
}

export function desarrolloSelectorLogoImageClass(desarrolloId: string): string {
  const base = "h-full w-full object-contain object-center";
  if (desarrolloId === "mision-la-gavia") {
    return `${base} scale-[1.08]`;
  }
  return base;
}
