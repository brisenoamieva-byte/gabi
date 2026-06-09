import { estimateMensualidad } from "./filters";
import { CORREDOR_DESARROLLOS } from "./zona-sur-seed";
import type { CorredorFilters } from "./types";

const roundDown = (n: number, step: number) => Math.floor(n / step) * step;
const roundUp = (n: number, step: number) => Math.ceil(n / step) * step;

const mensualidades = CORREDOR_DESARROLLOS.map((d) => estimateMensualidad(d));
const kms = CORREDOR_DESARROLLOS.map((d) => d.kmCorredor).filter(
  (k): k is number => k != null,
);

export const FILTER_BOUNDS = {
  lote: {
    min: roundDown(Math.min(...CORREDOR_DESARROLLOS.map((d) => d.loteMinM2)), 10),
    max: roundUp(Math.max(...CORREDOR_DESARROLLOS.map((d) => d.loteMaxM2)), 10),
    step: 10,
  },
  precioM2: {
    min: roundDown(Math.min(...CORREDOR_DESARROLLOS.map((d) => d.precioMinM2)), 100),
    max: roundUp(Math.max(...CORREDOR_DESARROLLOS.map((d) => d.precioMaxM2)), 100),
    step: 100,
  },
  ticket: {
    min: roundDown(Math.min(...CORREDOR_DESARROLLOS.map((d) => d.ticketDesde)), 50_000),
    max: roundUp(
      Math.max(...CORREDOR_DESARROLLOS.map((d) => d.ticketDesde)),
      50_000,
    ),
    step: 50_000,
  },
  mensualidad: {
    min: roundDown(Math.min(...mensualidades), 1_000),
    max: roundUp(Math.max(...mensualidades), 1_000),
    step: 1_000,
  },
  km: {
    min: kms.length ? Math.floor(Math.min(...kms)) : 0,
    max: kms.length ? Math.ceil(Math.max(...kms)) : 20,
    step: 0.5,
  },
  enganche: { min: 10, max: 30, step: 1 },
};

export type CorredorSliderValues = {
  loteMinM2: number;
  loteMaxM2: number;
  precioM2Min: number;
  precioM2Max: number;
  ticketMax: number;
  mensualidadMax: number;
  kmMin: number;
  kmMax: number;
  engancheMaxPct: number;
};

/** Valores de slider cuando no hay restricción (rango completo). */
export const FILTER_SLIDER_DEFAULTS: CorredorSliderValues = {
  loteMinM2: FILTER_BOUNDS.lote.min,
  loteMaxM2: FILTER_BOUNDS.lote.max,
  precioM2Min: FILTER_BOUNDS.precioM2.min,
  precioM2Max: FILTER_BOUNDS.precioM2.max,
  ticketMax: FILTER_BOUNDS.ticket.max,
  mensualidadMax: FILTER_BOUNDS.mensualidad.max,
  kmMin: FILTER_BOUNDS.km.min,
  kmMax: FILTER_BOUNDS.km.max,
  engancheMaxPct: FILTER_BOUNDS.enganche.max,
};

export function sliderValuesToFilters(values: CorredorSliderValues): CorredorFilters {
  return {
    loteMinM2:
      values.loteMinM2 > FILTER_BOUNDS.lote.min ? values.loteMinM2 : null,
    loteMaxM2:
      values.loteMaxM2 < FILTER_BOUNDS.lote.max ? values.loteMaxM2 : null,
    precioM2Min:
      values.precioM2Min > FILTER_BOUNDS.precioM2.min ? values.precioM2Min : null,
    precioM2Max:
      values.precioM2Max < FILTER_BOUNDS.precioM2.max ? values.precioM2Max : null,
    ticketMax:
      values.ticketMax < FILTER_BOUNDS.ticket.max ? values.ticketMax : null,
    mensualidadMax:
      values.mensualidadMax < FILTER_BOUNDS.mensualidad.max
        ? values.mensualidadMax
        : null,
    engancheMaxPct:
      values.engancheMaxPct < FILTER_BOUNDS.enganche.max
        ? values.engancheMaxPct
        : null,
    kmMin: values.kmMin > FILTER_BOUNDS.km.min ? values.kmMin : null,
    kmMax: values.kmMax < FILTER_BOUNDS.km.max ? values.kmMax : null,
    desarrolladorId: null,
    carretera: null,
    amenidadTags: [],
    soloProyectosPropios: false,
  };
}

export function filtersToSliderValues(filters: CorredorFilters): CorredorSliderValues {
  return {
    loteMinM2: filters.loteMinM2 ?? FILTER_BOUNDS.lote.min,
    loteMaxM2: filters.loteMaxM2 ?? FILTER_BOUNDS.lote.max,
    precioM2Min: filters.precioM2Min ?? FILTER_BOUNDS.precioM2.min,
    precioM2Max: filters.precioM2Max ?? FILTER_BOUNDS.precioM2.max,
    ticketMax: filters.ticketMax ?? FILTER_BOUNDS.ticket.max,
    mensualidadMax: filters.mensualidadMax ?? FILTER_BOUNDS.mensualidad.max,
    kmMin: filters.kmMin ?? FILTER_BOUNDS.km.min,
    kmMax: filters.kmMax ?? FILTER_BOUNDS.km.max,
    engancheMaxPct: filters.engancheMaxPct ?? FILTER_BOUNDS.enganche.max,
  };
}

export function mergeFiltersWithSliders(
  sliders: CorredorSliderValues,
  partial: Partial<CorredorFilters>,
): CorredorFilters {
  return {
    ...sliderValuesToFilters(sliders),
    ...partial,
  };
}

export function countActiveSliderFilters(
  sliders: CorredorSliderValues,
  filters: CorredorFilters,
): number {
  let n = 0;
  if (sliders.loteMinM2 > FILTER_BOUNDS.lote.min) n++;
  if (sliders.loteMaxM2 < FILTER_BOUNDS.lote.max) n++;
  if (sliders.precioM2Min > FILTER_BOUNDS.precioM2.min) n++;
  if (sliders.precioM2Max < FILTER_BOUNDS.precioM2.max) n++;
  if (sliders.ticketMax < FILTER_BOUNDS.ticket.max) n++;
  if (sliders.mensualidadMax < FILTER_BOUNDS.mensualidad.max) n++;
  if (sliders.engancheMaxPct < FILTER_BOUNDS.enganche.max) n++;
  if (sliders.kmMin > FILTER_BOUNDS.km.min) n++;
  if (sliders.kmMax < FILTER_BOUNDS.km.max) n++;
  if (filters.desarrolladorId) n++;
  if (filters.carretera) n++;
  if (filters.amenidadTags.length) n++;
  return n;
}
