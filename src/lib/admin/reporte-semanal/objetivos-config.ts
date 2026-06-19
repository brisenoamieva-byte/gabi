import { PASAJE_ALAMOS_ID } from "@/lib/comercial/sembrado-status";

/** Metas comerciales anuales (editable vía admin en fase 2 — hoy seed Pasaje). */
export type ReporteObjetivosAnuales = {
  ventasUnidades: number;
  apartadosObjetivo: number;
  ingresosTotales: number;
  ingresosMes: number;
  precioM2Objetivo: number;
  totalUnidades: number;
};

const PASAJE_OBJETIVOS: Record<string, ReporteObjetivosAnuales> = {
  departamentos: {
    ventasUnidades: 72,
    apartadosObjetivo: 74.5,
    ingresosTotales: 572_000_000,
    ingresosMes: 8_100_000,
    precioM2Objetivo: 52_540,
    totalUnidades: 81,
  },
  oficinas: {
    ventasUnidades: 52,
    apartadosObjetivo: 54,
    ingresosTotales: 302_795_372,
    ingresosMes: 4_700_000,
    precioM2Objetivo: 60_758,
    totalUnidades: 57,
  },
};

export function getObjetivosSegmento(
  desarrolloId: string,
  segmentoId: string,
): ReporteObjetivosAnuales | null {
  if (desarrolloId !== PASAJE_ALAMOS_ID) return null;
  return PASAJE_OBJETIVOS[segmentoId] ?? null;
}

/** Objetivo prorrateado al mes calendario del periodo. */
export function objetivoMes(obj: ReporteObjetivosAnuales): number {
  return obj.ingresosMes;
}

export function objetivoAcumuladoHastaMes(obj: ReporteObjetivosAnuales, monthIndex1: number): number {
  return Math.round((obj.ingresosTotales / 12) * monthIndex1);
}
