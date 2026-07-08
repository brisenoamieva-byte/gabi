import { LA_VISTA_RESIDENCIAL_ID } from "@/lib/catalog/desarrollos-registry";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Desarrollos pausados: sin crons, sin notificaciones automáticas ni cadencia.
 * También se respeta desarrollos_catalog.activo = false en Supabase.
 */
export const DESARROLLOS_AUTOMATION_PAUSED_IDS = [LA_VISTA_RESIDENCIAL_ID] as const;

const PAUSED_SET = new Set<string>(DESARROLLOS_AUTOMATION_PAUSED_IDS);

export const isDesarrolloAutomationPausedByPolicy = (desarrolloId: string): boolean =>
  PAUSED_SET.has(desarrolloId);

/** Desarrollo operativo para automatizaciones GABI (emails, WA, crons, cadencia). */
export const isDesarrolloAutomationActive = async (desarrolloId: string): Promise<boolean> => {
  if (isDesarrolloAutomationPausedByPolicy(desarrolloId)) {
    return false;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return true;
  }

  const { data, error } = await supabase
    .from("desarrollos_catalog")
    .select("activo")
    .eq("id", desarrolloId)
    .maybeSingle();

  if (error || !data) {
    return true;
  }

  return Boolean(data.activo);
};
