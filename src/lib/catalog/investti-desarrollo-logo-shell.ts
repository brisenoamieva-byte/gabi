import type { InvesttiCatalogDesarrolloId } from "@/lib/catalog/investti-desarrollos";

/** Recuadro del logo según arte oficial (simulador, cotizador, selector). */
export const INVESTTI_DESARROLLO_LOGO_SHELL: Record<
  InvesttiCatalogDesarrolloId,
  string
> = {
  "canadas-del-valle":
    "border-slate-200/90 bg-white shadow-[inset_0_1px_0_rgba(15,23,42,0.04)]",
  "canadas-del-arroyo":
    "border-slate-200/90 bg-white shadow-[inset_0_1px_0_rgba(15,23,42,0.04)]",
  simate:
    "border-[#2a2620]/60 bg-[#0C0B0A] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  "canadas-la-porta":
    "border-[#8a7358]/35 bg-[#A68B6B] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
};

export function investtiDesarrolloLogoShellClass(
  desarrolloId: string,
): string {
  return (
    INVESTTI_DESARROLLO_LOGO_SHELL[desarrolloId as InvesttiCatalogDesarrolloId] ??
    INVESTTI_DESARROLLO_LOGO_SHELL["canadas-del-valle"]
  );
}
