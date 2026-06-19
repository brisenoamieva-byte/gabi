import type { PropuestaEditableOverrides } from "@/lib/propuestas/overrides-types";
import type { PropuestaComercialData } from "@/lib/propuestas/types";

export function mergePropuestaComercialData(
  base: PropuestaComercialData,
  overrides: PropuestaEditableOverrides | null | undefined,
): PropuestaComercialData {
  if (!overrides) {
    return base;
  }

  return {
    ...base,
    estado: overrides.estado ?? base.estado,
    meta: { ...base.meta, ...overrides.meta },
    narrativa: {
      ...base.narrativa,
      ...overrides.narrativa,
      estrategia: overrides.narrativa?.estrategia?.length
        ? overrides.narrativa.estrategia
        : base.narrativa.estrategia,
    },
    propuestaBbr: {
      ...base.propuestaBbr,
      ...overrides.propuestaBbr,
      equipo: overrides.propuestaBbr?.equipo?.length
        ? overrides.propuestaBbr.equipo
        : base.propuestaBbr.equipo,
    },
  };
}
