import {
  CRM_PLAYBOOK_PILOT_DESARROLLO_IDS,
  getDefaultCrmPlaybook,
} from "@/lib/comercial/crm-playbook";
import { isDesarrolloAutomationActive } from "@/lib/comercial/desarrollo-automation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/** Playbook activo salvo fila explícita con enabled=false en crm_playbook_configs. */
export const isCrmPlaybookEnabledForDesarrollo = async (
  desarrolloId: string,
): Promise<boolean> => {
  if (!(await isDesarrolloAutomationActive(desarrolloId))) {
    return false;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return getDefaultCrmPlaybook(desarrolloId).enabled;
  }

  const { data, error } = await supabase
    .from("crm_playbook_configs")
    .select("enabled")
    .eq("desarrollo_id", desarrolloId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("crm_playbook_configs")) {
      return getDefaultCrmPlaybook(desarrolloId).enabled;
    }
    throw new Error(error.message);
  }

  if (!data) {
    return getDefaultCrmPlaybook(desarrolloId).enabled;
  }

  return Boolean(data.enabled);
};

/** Desarrollos del catálogo con playbook habilitado (default on; se excluyen disabled explícitos). */
export const listDesarrollosWithCrmPlaybookEnabled = async (): Promise<string[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [...CRM_PLAYBOOK_PILOT_DESARROLLO_IDS];
  }

  const [{ data: catalogRows, error: catalogError }, { data: configRows, error: configError }] =
    await Promise.all([
      supabase.from("desarrollos_catalog").select("id").eq("activo", true),
      supabase.from("crm_playbook_configs").select("desarrollo_id, enabled"),
    ]);

  if (catalogError) {
    throw new Error(catalogError.message);
  }

  const explicitlyDisabled = new Set<string>();
  if (!configError) {
    for (const row of configRows ?? []) {
      if (row.enabled === false) {
        explicitlyDisabled.add(row.desarrollo_id as string);
      }
    }
  }

  return (catalogRows ?? [])
    .map((row) => row.id as string)
    .filter((id) => !explicitlyDisabled.has(id));
};
