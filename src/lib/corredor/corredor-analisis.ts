import { CORREDOR_DESARROLLOS } from "./zona-sur-seed";

/** Desarrollos excluidos del análisis de mercado (datos no confiables o fuera de scope). */
export const CORREDOR_EXCLUIDOS_ANALISIS = ["arroyo-del-pedregal"] as const;

export type CorredorExcluidoAnalisis = (typeof CORREDOR_EXCLUIDOS_ANALISIS)[number];

export function isCorredorDesarrolloEnAnalisis(id: string): boolean {
  return !CORREDOR_EXCLUIDOS_ANALISIS.includes(id as CorredorExcluidoAnalisis);
}

/** Catálogo del corredor usado en estudios, gráficas y comparativos. */
export const CORREDOR_DESARROLLOS_ANALISIS = CORREDOR_DESARROLLOS.filter((d) =>
  isCorredorDesarrolloEnAnalisis(d.id),
);

export function countCorredorDesarrollosAnalisis(): number {
  return CORREDOR_DESARROLLOS_ANALISIS.length;
}
