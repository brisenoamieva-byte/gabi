import type { GuardiaTurno } from "@/lib/comercial/guardias";

export type GuardiaMarcajeAdminRow = {
  asignacionId: string;
  asesorId: string;
  asesorNombre: string | null;
  fecha: string;
  turno: GuardiaTurno;
  turnoLabel: string;
  estadoAsignacion: string;
  entrada: {
    registradoAt: string;
    distanciaMetros: number;
  } | null;
  salida: {
    registradoAt: string;
    distanciaMetros: number;
  } | null;
  cumplimiento: "completo" | "pendiente_entrada" | "pendiente_salida" | "sin_publicar";
};

export type GuardiaMarcajesDiaPayload = {
  fecha: string;
  desarrolloId: string;
  marcajesEnabled: boolean;
  caseta: {
    etiqueta: string | null;
    radioMetros: number;
    lat: number;
    lng: number;
  } | null;
  filas: GuardiaMarcajeAdminRow[];
};

export function formatMarcajeHora(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Mexico_City",
  }).format(new Date(iso));
}

export function guardiaMarcajeCumplimientoLabel(
  cumplimiento: GuardiaMarcajeAdminRow["cumplimiento"],
): string {
  switch (cumplimiento) {
    case "completo":
      return "Completo";
    case "pendiente_entrada":
      return "Sin entrada";
    case "pendiente_salida":
      return "Sin salida";
    default:
      return "No publicada";
  }
}
