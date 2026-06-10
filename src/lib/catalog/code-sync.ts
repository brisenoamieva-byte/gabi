import { applyInvesttiDesarrolloCatalogDefaults } from "@/lib/catalog/investti-desarrollos";
import {
  getMisionLaGaviaPrecioDesde,
  isMisionLaGaviaDesarrollo,
} from "@/lib/catalog/mision-la-gavia";
import { enrichDesarrolloFromStatic, type Desarrollo } from "@/lib/data";
import {
  getDefaultRecorridoContenido,
  type RecorridoContenido,
} from "@/lib/catalog/recorrido-content";

/**
 * Campos de recorrido que siempre se toman del código (Git) para que local y producción
 * coincidan aunque Supabase tenga un JSON antiguo. El resto del guion puede venir del admin.
 */
export const applyRecorridoCodeDefaults = (
  desarrolloId: string,
  contenido: RecorridoContenido,
): RecorridoContenido => {
  const defaults = getDefaultRecorridoContenido(desarrolloId);
  const defaultOverview = defaults.overview;
  const defaultDesarrollador = defaults.desarrollador;

  return {
    ...contenido,
    desarrollador: {
      ...contenido.desarrollador,
      logoPath: defaultDesarrollador.logoPath ?? contenido.desarrollador.logoPath,
    },
    overview: {
      ...contenido.overview,
      logoPath: defaultOverview.logoPath ?? contenido.overview.logoPath,
      masterPlanImage:
        defaultOverview.masterPlanImage ?? contenido.overview.masterPlanImage,
      masterPlanStats: defaultOverview.masterPlanStats?.length
        ? defaultOverview.masterPlanStats
        : contenido.overview.masterPlanStats,
    },
  };
};

export const applyMisionLaGaviaCatalogDefaults = <
  T extends {
    id: string;
    precioDesde?: number;
    logo?: string;
    brochurePdf?: string;
    tarjetasProcesoPdf?: string;
  },
>(
  desarrollo: T,
): T => {
  if (!isMisionLaGaviaDesarrollo(desarrollo.id)) {
    return desarrollo;
  }
  return {
    ...desarrollo,
    precioDesde: getMisionLaGaviaPrecioDesde(),
    logo: "/logos/mision-la-gavia.png",
    brochurePdf: desarrollo.brochurePdf ?? "/documentos/mision-la-gavia/brochure-jun26.pdf",
    tarjetasProcesoPdf:
      desarrollo.tarjetasProcesoPdf ?? "/documentos/mision-la-gavia/tarjetas-proceso.pdf",
  };
};

export const applyDesarrolloCodeDefaults = <T extends Desarrollo>(desarrollo: T): T =>
  applyMisionLaGaviaCatalogDefaults(
    applyInvesttiDesarrolloCatalogDefaults(enrichDesarrolloFromStatic(desarrollo) as T),
  );
