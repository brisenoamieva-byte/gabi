import { createSupabaseServiceClient } from "@/lib/supabase/server";

/** Desarrollo operativo en catálogo → automatizaciones GABI (crons, WA, cadencia, emails auto). */
export const isDesarrolloAutomationActive = async (desarrolloId: string): Promise<boolean> => {
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
