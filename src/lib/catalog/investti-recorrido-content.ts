import type { RecorridoContenido } from "@/lib/catalog/recorrido-content";
import {
  getInvesttiMapEmbedUrl,
  grupoInvesttiRecorrido,
  investtiRecorridoById,
  INVESTTI_DESARROLLO_LOGOS,
} from "@/lib/catalog/investti-recorrido-data";
import type { InvesttiCatalogDesarrolloId } from "@/lib/catalog/investti-desarrollos";
import { tecnicasCierre } from "@/lib/data";
import { getCorredorDesarrolloById } from "@/lib/corredor/zona-sur-seed";

function buildInvesttiRecorrido(desarrolloId: InvesttiCatalogDesarrolloId): RecorridoContenido {
  const staticData = investtiRecorridoById[desarrolloId];
  const corredor = getCorredorDesarrolloById(desarrolloId);
  const nombre =
    corredor?.nombre ??
    (desarrolloId === "canadas-la-porta" ? "Cañadas La Porta" : desarrolloId);

  const metricas = corredor
    ? [
        corredor.absorcionMes != null
          ? { valor: `${corredor.absorcionMes}`, etiqueta: "Lotes/mes" }
          : null,
        corredor.totalLotes != null
          ? { valor: `${corredor.totalLotes}`, etiqueta: "Lotes totales" }
          : null,
        { valor: `${corredor.loteMinM2}–${corredor.loteMaxM2}`, etiqueta: "Metraje m²" },
        corredor.ticketDesde
          ? {
              valor: `$${Math.round(corredor.ticketDesde / 1000)}K`,
              etiqueta: "Ticket desde",
            }
          : null,
      ].filter((m): m is { valor: string; etiqueta: string } => m != null)
    : staticData.masterPlanStats ?? [];

  const mapQuery = staticData.mapQuery;
  const mapaUrl = staticData.mapaUrl || corredor?.ubicacion?.mapsUrl || "";

  return {
    zona: {
      titulo: "Ubicación estratégica",
      subtitulo: staticData.zonaSubtitulo,
      centro: nombre,
      direccion: corredor?.mapQuery ?? mapQuery,
      mapaEmbedUrl: getInvesttiMapEmbedUrl(desarrolloId),
      mapaUrl,
      mensajeAsesor: staticData.mensajeAsesor,
      categoriasOrden: staticData.categoriasOrden,
      puntosCercanos: staticData.puntosCercanos.map((p) => ({ ...p })),
    },
    desarrollador: {
      ...grupoInvesttiRecorrido,
      metricas:
        metricas.length > 0
          ? metricas.slice(0, 4)
          : [...grupoInvesttiRecorrido.metricas],
      respaldo: [...grupoInvesttiRecorrido.respaldo],
      fraseAsesor: grupoInvesttiRecorrido.fraseAsesor,
      logoPath: grupoInvesttiRecorrido.logoPath,
    },
    overview: {
      titulo: nombre,
      subtitulo: staticData.overviewSubtitulo,
      narrativa: [...staticData.narrativa],
      destacados: [...staticData.destacados],
      logoPath: INVESTTI_DESARROLLO_LOGOS[desarrolloId],
      guiaAsesor: staticData.guiaAsesor,
      masterPlanImage: staticData.masterPlanImage,
      masterPlanStats: staticData.masterPlanStats
        ? [...staticData.masterPlanStats]
        : undefined,
    },
    bondades: staticData.bondades.length
      ? [...staticData.bondades]
      : [...(corredor?.argumentosVenta ?? [])],
    tecnicasCierre: [...tecnicasCierre],
    tecnicaDosMinutos: {
      titulo: "Técnica de 2 Minutos",
      tiempo: 120,
      puntos: [...staticData.tecnicaDosMinutos],
    },
  };
}

export function getInvesttiRecorridoContenido(
  desarrolloId: InvesttiCatalogDesarrolloId,
): RecorridoContenido {
  return buildInvesttiRecorrido(desarrolloId);
}
