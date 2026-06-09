import {
  CDV_SEMBRADO_RESUMEN,
  sellThroughEnRango,
} from "./cdv-sembrado-analisis";
import { getCdvTemporalEvidencia } from "./cdv-sembrado-temporal";
import { getEtapa4EvidenciaRecomendacion } from "./cdv-etapa4-lotificacion";
import { CORREDOR_STATS } from "./contexto-mercado";
import {
  CORREDOR_DESARROLLOS_ANALISIS,
  countCorredorDesarrollosAnalisis,
} from "./corredor-analisis";
import { CORREDOR_DESARROLLOS } from "./zona-sur-seed";
import { getMetrajePromedio } from "./metraje-chart";
import type { CorredorDesarrollo } from "./types";

/** Nicho de referencia para comparativo corredor (segmento de mayor volumen). */
export const METRAJE_NICHO_MIN = 200;
export const METRAJE_NICHO_MAX = 280;

/**
 * Rango recomendado — maximizar velocidad de venta:
 * donde hay demanda probada, poco stock y ticket dentro del corredor ($900K–$1.7M).
 */
export const METRAJE_RECOMENDADO_MIN = 220;
export const METRAJE_RECOMENDADO_MAX = 260;

export const CANADAS_DEL_VALLE_ID = "canadas-del-valle";
export const INVESTTI_DESARROLLADOR_ID = "investti";

/** Competidores directos de Cañadas del Valle (mismo corredor / ticket similar). */
export const CDV_COMPETIDORES_IDS = [
  "preserve-country",
  "preserve-sur",
  "canadas-del-arroyo",
  "velasur",
  "el-condado",
  "real-del-bosque",
  "simate",
  "valle-cardinal",
] as const;

export type FilaMatrizMetraje = {
  id: string;
  nombre: string;
  desarrollador: string;
  kmLabel: string;
  esInvestti: boolean;
  esCanadasDelValle: boolean;
  loteMinM2: number;
  loteMaxM2: number;
  precioMinM2: number;
  precioMaxM2: number;
  precioPromM2: number;
  ticketMin: number;
  ticketMax: number;
  absorcionMes: number | null;
  totalLotes: number | null;
  enNicho: "completo" | "parcial" | "no";
};

export type PuntoGap = {
  id: string;
  nombre: string;
  metrajePromedio: number;
  precioPromM2: number;
  absorcionMes: number | null;
  esInvestti: boolean;
  esCanadasDelValle: boolean;
  tamanoBurbuja: number;
};

export type RecomendacionMetraje = {
  rangoMin: number;
  rangoMax: number;
  titulo: string;
  resumen: string;
  evidencia: string[];
  competidoresEnNicho: CorredorDesarrollo[];
  competidoresFueraNicho: number;
  ticketEstimadoMin: number;
  ticketEstimadoMax: number;
};

function precioPromedio(d: CorredorDesarrollo): number {
  return (d.precioMinM2 + d.precioMaxM2) / 2;
}

/** Solapamiento del rango del desarrollo con [min, max] m². */
export function solapaMetraje(
  d: CorredorDesarrollo,
  min: number,
  max: number,
): "completo" | "parcial" | "no" {
  if (d.loteMaxM2 < min || d.loteMinM2 > max) return "no";
  if (d.loteMinM2 >= min && d.loteMaxM2 <= max) return "completo";
  return "parcial";
}

export function getCanadasDelValle(): CorredorDesarrollo {
  const d = CORREDOR_DESARROLLOS.find((x) => x.id === CANADAS_DEL_VALLE_ID);
  if (!d) throw new Error("Cañadas del Valle no encontrado en seed");
  return d;
}

export function getInvesttiDesarrollos(): CorredorDesarrollo[] {
  return CORREDOR_DESARROLLOS.filter((d) => d.desarrolladorId === INVESTTI_DESARROLLADOR_ID);
}

export function buildMatrizMetraje(
  desarrollos = CORREDOR_DESARROLLOS_ANALISIS,
  nichoMin = METRAJE_NICHO_MIN,
  nichoMax = METRAJE_NICHO_MAX,
): FilaMatrizMetraje[] {
  return [...desarrollos]
    .sort((a, b) => (a.kmCorredor ?? 99) - (b.kmCorredor ?? 99))
    .map((d) => {
      const prom = precioPromedio(d);
      return {
        id: d.id,
        nombre: d.nombre,
        desarrollador: d.desarrollador,
        kmLabel: d.kmLabel,
        esInvestti: d.desarrolladorId === INVESTTI_DESARROLLADOR_ID,
        esCanadasDelValle: d.id === CANADAS_DEL_VALLE_ID,
        loteMinM2: d.loteMinM2,
        loteMaxM2: d.loteMaxM2,
        precioMinM2: d.precioMinM2,
        precioMaxM2: d.precioMaxM2,
        precioPromM2: Math.round(prom),
        ticketMin: Math.round(d.loteMinM2 * d.precioMinM2),
        ticketMax: Math.round(d.loteMaxM2 * d.precioMaxM2),
        absorcionMes: d.absorcionMes,
        totalLotes: d.totalLotes,
        enNicho: solapaMetraje(d, nichoMin, nichoMax),
      };
    });
}

export function getAbsorcionRanking(
  desarrollos = CORREDOR_DESARROLLOS_ANALISIS,
): Array<FilaMatrizMetraje & { ranking: number }> {
  const conDato = buildMatrizMetraje(desarrollos).filter((r) => r.absorcionMes != null);
  return conDato
    .sort((a, b) => (b.absorcionMes ?? 0) - (a.absorcionMes ?? 0))
    .map((r, i) => ({ ...r, ranking: i + 1 }));
}

export function getGapChartData(desarrollos = CORREDOR_DESARROLLOS_ANALISIS): PuntoGap[] {
  return desarrollos.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    metrajePromedio: getMetrajePromedio(d),
    precioPromM2: Math.round(precioPromedio(d)),
    absorcionMes: d.absorcionMes,
    esInvestti: d.desarrolladorId === INVESTTI_DESARROLLADOR_ID,
    esCanadasDelValle: d.id === CANADAS_DEL_VALLE_ID,
    tamanoBurbuja: Math.min(48, 14 + (d.absorcionMes ?? 0) * 2),
  }));
}

export function getCompetidoresDirectosCDV(): CorredorDesarrollo[] {
  return CDV_COMPETIDORES_IDS.map((id) =>
    CORREDOR_DESARROLLOS.find((d) => d.id === id),
  ).filter((d): d is CorredorDesarrollo => d != null);
}

function formatTicketReferencia(n: number): string {
  if (n >= 1_000_000) {
    const millones = n / 1_000_000;
    const texto = millones.toFixed(2).replace(/\.?0+$/, "");
    return `~$${texto}M`;
  }
  return `~$${Math.round(n / 1000)}K`;
}

function lineaTicketsCompetenciaDirecta(): string {
  const refs: Array<{ id: string; label: string }> = [
    { id: "canadas-del-arroyo", label: "Arroyo" },
    { id: "simate", label: "Simaté" },
    { id: "preserve-country", label: "Preserve" },
    { id: "real-del-bosque", label: "Real del Bosque" },
    { id: "velasur", label: "Velasur" },
  ];
  return refs
    .map(({ id, label }) => {
      const d = CORREDOR_DESARROLLOS.find((x) => x.id === id);
      return d ? `${label} (${formatTicketReferencia(d.ticketDesde)})` : null;
    })
    .filter((s): s is string => s != null)
    .join(", ");
}

export function buildRecomendacionMetraje(): RecomendacionMetraje {
  const cdv = getCanadasDelValle();
  const matriz = buildMatrizMetraje();
  const absorcionRanking = getAbsorcionRanking();
  const lider = absorcionRanking[0];

  const ticketEstimadoMin = Math.round(METRAJE_RECOMENDADO_MIN * cdv.precioMinM2);
  const ticketEstimadoMax = Math.round(METRAJE_RECOMENDADO_MAX * cdv.precioMaxM2);
  const st200_250 = sellThroughEnRango(200, 250);
  const r = CDV_SEMBRADO_RESUMEN;

  return {
    rangoMin: METRAJE_RECOMENDADO_MIN,
    rangoMax: METRAJE_RECOMENDADO_MAX,
    titulo: `Nueva etapa Cañadas del Valle: ${METRAJE_RECOMENDADO_MIN}–${METRAJE_RECOMENDADO_MAX} m²`,
    resumen:
      `En 200–250 m² el inventario de la etapa actual está casi agotado: ${st200_250.min}–${st200_250.max}% de ese tramo ya se vendió y quedan ${r.disponibles200a250} lotes. Los apartados activos piden ~${r.medianaApartadoM2} m². Proponemos ${METRAJE_RECOMENDADO_MIN}–${METRAJE_RECOMENDADO_MAX} m² para reponer producto donde el mercado ya compra, sin duplicar los ${r.disponibles160a200} lotes en 160–200 m² que aún tenemos.`,
    evidencia: [
      `Sembrado v.4: ${r.demanda200a250} ventas o apartados en 200–250 m²; ${st200_250.min}–${st200_250.max}% del inventario de ese tramo ya vendido o apartado; quedan ${r.disponibles200a250} lotes.`,
      `Apartados activos con mediana de ${r.medianaApartadoM2} m² — encajan en ${METRAJE_RECOMENDADO_MIN}–${METRAJE_RECOMENDADO_MAX} m².`,
      `Etapa actual: ${r.disponibles160a200} lotes libres en 160–200 m². La nueva etapa no debe repetir ese tamaño.`,
      `Ticket estimado $${ticketEstimadoMin.toLocaleString("es-MX")} – $${ticketEstimadoMax.toLocaleString("es-MX")}, comparable a ${lineaTicketsCompetenciaDirecta()}.`,
      `CDV vende ${cdv.absorcionMes} lotes/mes (${Math.round((cdv.absorcionMes ?? 0) / CORREDOR_STATS.absorcionPromMes)}× el promedio del corredor).`,
      getEtapa4EvidenciaRecomendacion(METRAJE_RECOMENDADO_MIN, METRAJE_RECOMENDADO_MAX),
      getCdvTemporalEvidencia()[0],
      lider?.esCanadasDelValle
        ? `CDV lidera la absorción entre los ${countCorredorDesarrollosAnalisis()} desarrollos del corredor sur.`
        : `${lider?.nombre} referencia de mercado con ${lider?.absorcionMes} lotes/mes.`,
    ],
    competidoresEnNicho: CORREDOR_DESARROLLOS_ANALISIS.filter(
      (d) =>
        d.id !== CANADAS_DEL_VALLE_ID &&
        solapaMetraje(d, METRAJE_NICHO_MIN, METRAJE_NICHO_MAX) !== "no",
    ),
    competidoresFueraNicho: matriz.filter((r) => r.enNicho === "no" && !r.esInvestti).length,
    ticketEstimadoMin,
    ticketEstimadoMax,
  };
}

export function countCompetidoresEnNicho(
  min = METRAJE_NICHO_MIN,
  max = METRAJE_NICHO_MAX,
): number {
  return CORREDOR_DESARROLLOS_ANALISIS.filter(
    (d) =>
      d.id !== CANADAS_DEL_VALLE_ID &&
      d.desarrolladorId !== INVESTTI_DESARROLLADOR_ID &&
      solapaMetraje(d, min, max) !== "no",
  ).length;
}
