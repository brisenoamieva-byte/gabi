/** Marcador en prospectos.notas al cancelar un apartado/venta. */
export const APARTADO_CANCELADO_NOTA_PREFIX = "[Apartó y canceló";

export const notasTienenApartadoCancelado = (notas?: string | null): boolean =>
  Boolean(notas?.includes(APARTADO_CANCELADO_NOTA_PREFIX));

/** Extrae la fecha YYYY-MM-DD del último marcador de cancelación en notas. */
export const parseApartadoCanceladoFecha = (notas?: string | null): string | null => {
  if (!notas) {
    return null;
  }
  const re = /\[Apartó y canceló (\d{4}-\d{2}-\d{2})\]/g;
  let last: string | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(notas)) !== null) {
    last = match[1] ?? null;
  }
  return last;
};

/** Línea secundaria para tarjetas de listado (no confundir con motivo de descarte). */
export const prospectoContactoOHistorialLabel = (row: {
  email?: string | null;
  telefono?: string | null;
  notas?: string | null;
  etapa?: string | null;
}): string => {
  if (row.etapa === "cancelado" || notasTienenApartadoCancelado(row.notas)) {
    const fecha = parseApartadoCanceladoFecha(row.notas);
    return fecha ? `Cancelado · ${fecha}` : "Cancelado (apartó)";
  }
  return row.email?.trim() || row.telefono?.trim() || "Sin teléfono/email";
};
