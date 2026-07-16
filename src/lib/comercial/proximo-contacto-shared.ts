import type { ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";
import { CADENCIA_TIMEZONE } from "@/lib/comercial/cadencia-perfilamiento";

/** Hoy en calendario México (AAAA-MM-DD). */
export function todayIsoMexico(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CADENCIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Valida fecha AAAA-MM-DD o vacío → null. */
export function normalizeProximoContactoOn(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Fecha de próximo contacto inválida. Usa AAAA-MM-DD.");
  }
  return trimmed;
}

export type ProximoContactoHoyItem = {
  prospectoId: string;
  nombre: string;
  telefono: string | null;
  etapa: ProspectoEtapa | string;
  proximoContactoOn: string;
  proximoContactoNota: string | null;
  isOverdue: boolean;
  isDueToday: boolean;
};
