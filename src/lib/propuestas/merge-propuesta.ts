import { CONSULTORIA_MARCA_META_KEY } from "@/lib/brand/consultoria-marca";
import type { PropuestaEditableOverrides } from "@/lib/propuestas/overrides-types";
import type { PropuestaComercialData } from "@/lib/propuestas/types";

function mergeMeta(
  base: PropuestaComercialData["meta"],
  patch: PropuestaEditableOverrides["meta"],
): PropuestaComercialData["meta"] {
  if (!patch) return base;
  const rest = { ...(patch as Record<string, string>) };
  delete rest[CONSULTORIA_MARCA_META_KEY];
  return { ...base, ...rest };
}

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
    meta: mergeMeta(base.meta, overrides.meta),
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
