import type { DisponibilidadUnidad } from "@/lib/data";

export type SaveCotizacionClientInput = {
  desarrolloId: string;
  asesorId?: string;
  prospectoId?: string;
  clienteNombre?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  medioContacto?: string;
  unidadId?: string;
  clusterId?: string;
  prototipoId?: string;
  unidadNumero?: string;
  tipoUnidad?: "departamento" | "oficina" | "casa" | "terreno";
  precioLista?: number;
  esquemaPago?: string;
  descuentoPct?: number;
  precioTotal?: number;
  pdfGenerado?: boolean;
  payload?: Record<string, unknown>;
};

export const resolveTipoUnidadFromInventario = (
  unidad?: DisponibilidadUnidad | null,
): SaveCotizacionClientInput["tipoUnidad"] => {
  switch (unidad?.tipo) {
    case "oficina":
      return "oficina";
    case "casa":
      return "casa";
    case "terreno":
      return "terreno";
    default:
      return "departamento";
  }
};

export const calcDescuentoPct = (descuento: number, precioLista: number) =>
  precioLista > 0 ? (descuento / precioLista) * 100 : 0;

/** Persiste cotización en Supabase (prospecto + cotización). Fire-and-forget. */
export const saveCotizacionClient = (input: SaveCotizacionClientInput): void => {
  const clienteNombre = input.clienteNombre?.trim();
  const precioTotal = input.precioTotal ?? 0;
  const precioLista = input.precioLista ?? 0;

  if (!input.desarrolloId || !clienteNombre) {
    return;
  }

  if (precioTotal <= 0 && precioLista <= 0) {
    return;
  }

  void fetch("/api/cotizaciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      desarrolloId: input.desarrolloId,
      asesorId: input.asesorId,
      prospectoId: input.prospectoId,
      clienteNombre,
      clienteEmail: input.clienteEmail,
      clienteTelefono: input.clienteTelefono,
      medioContacto: input.medioContacto,
      unidadId: input.unidadId,
      clusterId: input.clusterId,
      prototipoId: input.prototipoId,
      unidadNumero: input.unidadNumero,
      tipoUnidad: input.tipoUnidad,
      precioLista: precioLista || undefined,
      esquemaPago: input.esquemaPago,
      descuentoPct: input.descuentoPct,
      precioTotal: precioTotal || precioLista || undefined,
      pdfGenerado: input.pdfGenerado ?? false,
      payload: input.payload ?? {},
    }),
  }).catch(() => {
    // La cotización en servidor es complementaria; no bloquea la UI del asesor.
  });
};
