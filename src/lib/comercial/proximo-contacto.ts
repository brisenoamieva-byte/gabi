import { CADENCIA_TIMEZONE } from "@/lib/comercial/cadencia-perfilamiento";
import { resolveProspectoAsesorFilter } from "@/lib/asesores/leadership-access";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isProspectoEtapa, type ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";

const ETAPAS_CERRADAS = new Set<ProspectoEtapa>([
  "apartado",
  "vendido",
  "cancelado",
  "perdido",
]);

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

/**
 * Prospectos con fecha de recontacto vencida o de hoy (recordatorio al asesor).
 */
export async function listProximosContactosDueForAsesor(
  asesorId: string,
  desarrolloId: string,
): Promise<ProximoContactoHoyItem[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const today = todayIsoMexico();
  const asesorFilter = await resolveProspectoAsesorFilter(asesorId);

  let query = supabase
    .from("prospectos")
    .select(
      "id, nombre, telefono, etapa, proximo_contacto_on, proximo_contacto_nota, asesor_id",
    )
    .eq("desarrollo_id", desarrolloId)
    .eq("activo", true)
    .not("proximo_contacto_on", "is", null)
    .lte("proximo_contacto_on", today)
    .order("proximo_contacto_on", { ascending: true });

  if (asesorFilter) {
    query = query.eq("asesor_id", asesorFilter);
  }

  const { data, error } = await query;
  if (error || !data?.length) {
    return [];
  }

  return data
    .filter((row) => {
      const etapa = isProspectoEtapa(row.etapa as string)
        ? (row.etapa as ProspectoEtapa)
        : null;
      return !etapa || !ETAPAS_CERRADAS.has(etapa);
    })
    .map((row) => {
      const date = String(row.proximo_contacto_on);
      return {
        prospectoId: row.id as string,
        nombre: row.nombre as string,
        telefono: (row.telefono as string | null) ?? null,
        etapa: (row.etapa as string) ?? "nuevo",
        proximoContactoOn: date,
        proximoContactoNota: (row.proximo_contacto_nota as string | null) ?? null,
        isOverdue: date < today,
        isDueToday: date === today,
      };
    });
}
