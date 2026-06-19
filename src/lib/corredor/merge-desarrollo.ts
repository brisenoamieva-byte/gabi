import type { CorredorDesarrolloEditableOverrides } from "@/lib/corredor/overrides-types";
import type { CorredorDesarrollo } from "@/lib/corredor/types";

export function mergeCorredorDesarrollo(
  base: CorredorDesarrollo,
  overrides: CorredorDesarrolloEditableOverrides | null | undefined,
): CorredorDesarrollo {
  if (!overrides) {
    return base;
  }

  return {
    ...base,
    destacado: overrides.destacado ?? base.destacado,
    notas: overrides.notas ?? base.notas,
    guiaAsesor: overrides.guiaAsesor ?? base.guiaAsesor,
    argumentosVenta: overrides.argumentosVenta?.length
      ? overrides.argumentosVenta
      : base.argumentosVenta,
    loteMinM2: overrides.loteMinM2 ?? base.loteMinM2,
    loteMaxM2: overrides.loteMaxM2 ?? base.loteMaxM2,
    precioMinM2: overrides.precioMinM2 ?? base.precioMinM2,
    precioMaxM2: overrides.precioMaxM2 ?? base.precioMaxM2,
    ticketDesde: overrides.ticketDesde ?? base.ticketDesde,
    absorcionMes:
      overrides.absorcionMes !== undefined ? overrides.absorcionMes : base.absorcionMes,
    totalLotes: overrides.totalLotes !== undefined ? overrides.totalLotes : base.totalLotes,
    enganchePct: overrides.enganchePct !== undefined ? overrides.enganchePct : base.enganchePct,
    plazoMeses: overrides.plazoMeses !== undefined ? overrides.plazoMeses : base.plazoMeses,
    amenidades: overrides.amenidades?.length ? overrides.amenidades : base.amenidades,
  };
}

export function isCorredorDesarrolloOculto(
  overrides: CorredorDesarrolloEditableOverrides | null | undefined,
): boolean {
  return Boolean(overrides?.oculto);
}
