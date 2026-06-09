import { CDV_SEMBRADO_RESUMEN } from "./cdv-sembrado-analisis";
import { INVESTTI_SEMBRADO_METRAJE_PROMEDIO } from "./investti-sembrado-promedios.generated";
import type { CorredorDesarrollo } from "./types";

const CANADAS_DEL_VALLE_ID = "canadas-del-valle";

const SEMBRADO_METRAJE_PROMEDIO: Record<string, number> = {
  [CANADAS_DEL_VALLE_ID]: CDV_SEMBRADO_RESUMEN.promedioSembradoM2,
  ...INVESTTI_SEMBRADO_METRAJE_PROMEDIO,
};

/** Desarrollos cuyo ø proviene de sembrado Control Gerencia (no estimación de catálogo). */
export const DESARROLLOS_CON_SEMBRADO_METRAJE = Object.keys(SEMBRADO_METRAJE_PROMEDIO);

/**
 * Promedio de metraje para gráficas comparativas.
 * Investti con sembrado: promedio real de todos los lotes. Resto: (mín+máx)/2 del catálogo.
 */
export function getMetrajePromedio(d: CorredorDesarrollo): number {
  const sembrado = SEMBRADO_METRAJE_PROMEDIO[d.id];
  if (sembrado != null) return sembrado;
  return Math.round((d.loteMinM2 + d.loteMaxM2) / 2);
}

export function tieneSembradoMetraje(desarrolloId: string): boolean {
  return desarrolloId in SEMBRADO_METRAJE_PROMEDIO;
}

export type MetrajeChartSort = "km" | "min" | "amplitud";

export type MetrajeScale = {
  min: number;
  max: number;
  ticks: number[];
};

export function buildMetrajeScale(desarrollos: CorredorDesarrollo[]): MetrajeScale {
  if (desarrollos.length === 0) {
    return { min: 0, max: 700, ticks: [0, 100, 200, 300, 400, 500, 600, 700] };
  }

  const dataMin = Math.min(...desarrollos.map((d) => d.loteMinM2));
  const dataMax = Math.max(...desarrollos.map((d) => d.loteMaxM2));
  const min = Math.max(0, Math.floor(dataMin / 50) * 50 - 20);
  const max = Math.ceil(dataMax / 50) * 50 + 30;

  const step = max <= 400 ? 50 : 100;
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) {
    ticks.push(v);
  }
  if (ticks[ticks.length - 1] !== max) ticks.push(max);

  return { min, max, ticks };
}

export function metrajeToPercent(value: number, scale: MetrajeScale): number {
  const span = scale.max - scale.min;
  if (span <= 0) return 0;
  return ((value - scale.min) / span) * 100;
}

export function sortDesarrollosForMetrajeChart(
  desarrollos: CorredorDesarrollo[],
  sortBy: MetrajeChartSort,
): CorredorDesarrollo[] {
  return [...desarrollos].sort((a, b) => {
    if (sortBy === "km") {
      return (a.kmCorredor ?? 99) - (b.kmCorredor ?? 99);
    }
    if (sortBy === "amplitud") {
      return b.loteMaxM2 - b.loteMinM2 - (a.loteMaxM2 - a.loteMinM2);
    }
    return a.loteMinM2 - b.loteMinM2;
  });
}

export function getMetrajeChartStats(desarrollos: CorredorDesarrollo[]) {
  if (desarrollos.length === 0) {
    return { globalMin: 0, globalMax: 0, masAmplio: null, masCompacto: null };
  }

  const globalMin = Math.min(...desarrollos.map((d) => d.loteMinM2));
  const globalMax = Math.max(...desarrollos.map((d) => d.loteMaxM2));

  const masAmplio = [...desarrollos].sort(
    (a, b) => b.loteMaxM2 - b.loteMinM2 - (a.loteMaxM2 - a.loteMinM2),
  )[0];

  const masCompacto = [...desarrollos].sort(
    (a, b) => a.loteMaxM2 - a.loteMinM2 - (b.loteMaxM2 - b.loteMinM2),
  )[0];

  return { globalMin, globalMax, masAmplio, masCompacto };
}
