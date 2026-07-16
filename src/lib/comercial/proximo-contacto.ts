import { resolveProspectoAsesorFilter } from "@/lib/asesores/leadership-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isProspectoEtapa, type ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";
import {
  todayIsoMexico,
  type ProximoContactoHoyItem,
} from "@/lib/comercial/proximo-contacto-shared";

export {
  todayIsoMexico,
  normalizeProximoContactoOn,
  type ProximoContactoHoyItem,
} from "@/lib/comercial/proximo-contacto-shared";

const ETAPAS_CERRADAS = new Set<ProspectoEtapa>([
  "apartado",
  "vendido",
  "cancelado",
  "perdido",
]);

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
