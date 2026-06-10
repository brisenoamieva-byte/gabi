import { misionLaGaviaCatalogSummary } from "@/lib/catalog/mision-la-gavia.generated";

export const MISION_LA_GAVIA_DESARROLLO_ID = "mision-la-gavia";
export const MISION_LA_GAVIA_CLUSTER_ID = "mision-la-gavia-departamentos";

export function isMisionLaGaviaDesarrollo(
  desarrolloId: string | null | undefined,
): desarrolloId is typeof MISION_LA_GAVIA_DESARROLLO_ID {
  return desarrolloId === MISION_LA_GAVIA_DESARROLLO_ID;
}

export function getMisionLaGaviaPrecioDesde(): number {
  return misionLaGaviaCatalogSummary.precioDesdeContado;
}

export function misionLaGaviaHasSimulador(): boolean {
  return true;
}
