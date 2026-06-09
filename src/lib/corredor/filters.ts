import type { CorredorDesarrollo, CorredorFilters } from "./types";

export const DEFAULT_CORREDOR_FILTERS: CorredorFilters = {
  loteMinM2: null,
  loteMaxM2: null,
  precioM2Min: null,
  precioM2Max: null,
  ticketMax: null,
  engancheMaxPct: null,
  mensualidadMax: null,
  desarrolladorId: null,
  carretera: null,
  kmMin: null,
  kmMax: null,
  amenidadTags: [],
  soloProyectosPropios: false,
};

const DEFAULT_ENGANCHE = 0.15;
const DEFAULT_PLAZO = 60;

export function estimateMensualidad(
  desarrollo: CorredorDesarrollo,
  loteM2?: number,
): number {
  const m2 = loteM2 ?? (desarrollo.loteMinM2 + desarrollo.loteMaxM2) / 2;
  const precioM2 = (desarrollo.precioMinM2 + desarrollo.precioMaxM2) / 2;
  const ticket = m2 * precioM2;
  const enganche = desarrollo.enganchePct ?? DEFAULT_ENGANCHE * 100;
  const plazo = desarrollo.plazoMeses ?? DEFAULT_PLAZO;
  const financiado = ticket * (1 - enganche / 100);
  return Math.round(financiado / plazo);
}

export function estimateTicketPromedio(desarrollo: CorredorDesarrollo): number {
  const m2Prom = (desarrollo.loteMinM2 + desarrollo.loteMaxM2) / 2;
  const precioProm = (desarrollo.precioMinM2 + desarrollo.precioMaxM2) / 2;
  return Math.round(m2Prom * precioProm);
}

function overlapsRange(
  minA: number,
  maxA: number,
  minB: number | null,
  maxB: number | null,
): boolean {
  if (minB !== null && maxA < minB) return false;
  if (maxB !== null && minA > maxB) return false;
  return true;
}

export function filterCorredorDesarrollos(
  desarrollos: CorredorDesarrollo[],
  filters: CorredorFilters,
): CorredorDesarrollo[] {
  return desarrollos.filter((d) => {
    if (filters.soloProyectosPropios && !d.esProyectoPropio) return false;

    if (filters.desarrolladorId && d.desarrolladorId !== filters.desarrolladorId) {
      return false;
    }

    if (filters.carretera && d.carretera !== filters.carretera) return false;

    if (
      !overlapsRange(d.loteMinM2, d.loteMaxM2, filters.loteMinM2, filters.loteMaxM2)
    ) {
      return false;
    }

    if (filters.precioM2Min !== null && d.precioMaxM2 < filters.precioM2Min) {
      return false;
    }

    if (filters.precioM2Max !== null && d.precioMinM2 > filters.precioM2Max) {
      return false;
    }

    if (filters.ticketMax !== null && d.ticketDesde > filters.ticketMax) {
      return false;
    }

    if (filters.engancheMaxPct !== null) {
      const eng = d.enganchePct ?? DEFAULT_ENGANCHE * 100;
      if (eng > filters.engancheMaxPct) return false;
    }

    if (filters.mensualidadMax !== null) {
      const mens = estimateMensualidad(d);
      if (mens > filters.mensualidadMax) return false;
    }

    if (filters.kmMin !== null || filters.kmMax !== null) {
      if (d.kmCorredor === null) return false;
      if (filters.kmMin !== null && d.kmCorredor < filters.kmMin) return false;
      if (filters.kmMax !== null && d.kmCorredor > filters.kmMax) return false;
    }

    if (filters.amenidadTags.length > 0) {
      const hasAll = filters.amenidadTags.every((tag) => d.amenidadTags.includes(tag));
      if (!hasAll) return false;
    }

    return true;
  });
}

export function countActiveFilters(filters: CorredorFilters): number {
  let n = 0;
  if (filters.loteMinM2 !== null) n++;
  if (filters.loteMaxM2 !== null) n++;
  if (filters.precioM2Min !== null) n++;
  if (filters.precioM2Max !== null) n++;
  if (filters.ticketMax !== null) n++;
  if (filters.engancheMaxPct !== null) n++;
  if (filters.mensualidadMax !== null) n++;
  if (filters.desarrolladorId) n++;
  if (filters.carretera) n++;
  if (filters.kmMin !== null) n++;
  if (filters.kmMax !== null) n++;
  if (filters.amenidadTags.length) n++;
  if (filters.soloProyectosPropios) n++;
  return n;
}
