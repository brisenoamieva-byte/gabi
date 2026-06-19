import type { CorredorDesarrollo } from "@/lib/corredor/types";

/** Campos editables en admin sin reimportar el seed completo. */
export type CorredorDesarrolloEditableOverrides = {
  oculto?: boolean;
  destacado?: boolean;
  notas?: string;
  guiaAsesor?: string;
  argumentosVenta?: string[];
  loteMinM2?: number;
  loteMaxM2?: number;
  precioMinM2?: number;
  precioMaxM2?: number;
  ticketDesde?: number;
  absorcionMes?: number | null;
  totalLotes?: number | null;
  enganchePct?: number | null;
  plazoMeses?: number | null;
  amenidades?: string[];
};

export type CorredorOverridesPublishMeta = {
  updatedAt: string;
  origin: "static" | "supabase";
  published: boolean;
};

export type CorredorCatalogMeta = {
  updatedAt: string;
  origin: "static" | "supabase";
  overrideCount: number;
};

export function extractEditableFromDesarrollo(
  data: CorredorDesarrollo,
): CorredorDesarrolloEditableOverrides {
  return {
    oculto: false,
    destacado: data.destacado,
    notas: data.notas,
    guiaAsesor: data.guiaAsesor,
    argumentosVenta: data.argumentosVenta ? [...data.argumentosVenta] : undefined,
    loteMinM2: data.loteMinM2,
    loteMaxM2: data.loteMaxM2,
    precioMinM2: data.precioMinM2,
    precioMaxM2: data.precioMaxM2,
    ticketDesde: data.ticketDesde,
    absorcionMes: data.absorcionMes,
    totalLotes: data.totalLotes,
    enganchePct: data.enganchePct,
    plazoMeses: data.plazoMeses,
    amenidades: [...data.amenidades],
  };
}
