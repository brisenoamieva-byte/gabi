/**
 * Motivos de descarte (etapa perdido) — catálogo inmobiliario MX.
 * Código estable para estadísticas; label en español para UI/reportes.
 */

export const MOTIVOS_DESCARTE = [
  {
    id: "no_localizable",
    label: "No localizable / no contesta",
    requiresDetalle: false,
  },
  {
    id: "datos_falsos",
    label: "Datos falsos o spam",
    requiresDetalle: false,
  },
  {
    id: "es_proveedor",
    label: "Es proveedor / no es comprador",
    requiresDetalle: false,
  },
  {
    id: "falta_presupuesto",
    label: "Fuera de presupuesto",
    requiresDetalle: false,
  },
  {
    id: "buscaba_otro_producto",
    label: "Buscaba otro producto o tipología",
    requiresDetalle: false,
  },
  {
    id: "compro_otro_lado",
    label: "Compró en otro lado",
    requiresDetalle: true,
    detalleLabel: "¿Dónde compró? (desarrollo, zona o marca)",
  },
  {
    id: "no_le_interesa",
    label: "Ya no le interesa / cambió de opinión",
    requiresDetalle: false,
  },
  {
    id: "zona_ubicacion",
    label: "No le convenció la zona o ubicación",
    requiresDetalle: false,
  },
  {
    id: "plazos_entrega",
    label: "Plazos de entrega / tiempos del proyecto",
    requiresDetalle: false,
  },
  {
    id: "financiamiento",
    label: "No obtuvo crédito o financiamiento",
    requiresDetalle: false,
  },
  {
    id: "solo_informacion",
    label: "Solo pedía información / curiosidad",
    requiresDetalle: false,
  },
  {
    id: "duplicado",
    label: "Prospecto duplicado",
    requiresDetalle: false,
  },
  {
    id: "otro",
    label: "Otro",
    requiresDetalle: true,
    detalleLabel: "Describe el motivo",
  },
] as const;

export type MotivoDescarteId = (typeof MOTIVOS_DESCARTE)[number]["id"];

export const MOTIVO_DESCARTE_IDS = MOTIVOS_DESCARTE.map((item) => item.id);

export const isMotivoDescarteId = (value: string): value is MotivoDescarteId =>
  MOTIVO_DESCARTE_IDS.includes(value as MotivoDescarteId);

export const motivoDescarteLabel = (id?: string | null): string => {
  if (!id) return "Sin motivo";
  const found = MOTIVOS_DESCARTE.find((item) => item.id === id);
  return found?.label ?? id;
};

export const motivoDescarteRequiresDetalle = (id?: string | null): boolean => {
  if (!id) return false;
  const found = MOTIVOS_DESCARTE.find((item) => item.id === id);
  return Boolean(found && "requiresDetalle" in found && found.requiresDetalle);
};

export const motivoDescarteDetalleLabel = (id?: string | null): string => {
  const found = MOTIVOS_DESCARTE.find((item) => item.id === id);
  if (found && "detalleLabel" in found && found.detalleLabel) {
    return found.detalleLabel;
  }
  return "Detalle (opcional)";
};

/** Texto completo para listados: label + detalle si aplica. */
export const formatMotivoDescarte = (
  id?: string | null,
  detalle?: string | null,
): string => {
  const label = motivoDescarteLabel(id);
  const extra = detalle?.trim();
  if (!id) return label;
  if (extra) return `${label}: ${extra}`;
  return label;
};

export type MotivoDescarteValidation =
  | { ok: true; motivoDescarte: MotivoDescarteId; motivoDescarteDetalle: string | null }
  | { ok: false; error: string };

/** Valida motivo al pasar a Descartado. */
export const validateMotivoDescarteForPerdido = (input: {
  motivoDescarte?: string | null;
  motivoDescarteDetalle?: string | null;
}): MotivoDescarteValidation => {
  const motivo = input.motivoDescarte?.trim() ?? "";
  if (!motivo || !isMotivoDescarteId(motivo)) {
    return { ok: false, error: "Elige el motivo de descarte (obligatorio)." };
  }
  const detalle = input.motivoDescarteDetalle?.trim() || null;
  if (motivoDescarteRequiresDetalle(motivo) && !detalle) {
    return {
      ok: false,
      error: `${motivoDescarteDetalleLabel(motivo)} es obligatorio.`,
    };
  }
  return { ok: true, motivoDescarte: motivo, motivoDescarteDetalle: detalle };
};

/** Mapeo a calificación Xperience legacy cuando aplica. */
export const calificacionFromMotivoDescarte = (motivo: MotivoDescarteId): string => {
  if (motivo === "datos_falsos" || motivo === "duplicado") {
    return "Descartado / Datos Falsos";
  }
  return "Descartado / No le Interesa";
};
