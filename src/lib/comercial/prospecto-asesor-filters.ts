/** Sentinels de filtro de asesor en listados CRM (admin y gerencia). */
export const ASESOR_FILTER_SIN_ASIGNAR = "__sin__";
export const ASESOR_FILTER_INACTIVOS = "__inactivos__";

export const isAsesorFilterSinAsignar = (value: string | null | undefined) =>
  value === ASESOR_FILTER_SIN_ASIGNAR;

export const isAsesorFilterInactivos = (value: string | null | undefined) =>
  value === ASESOR_FILTER_INACTIVOS;
