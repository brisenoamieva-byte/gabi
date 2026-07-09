import { getAsesorSessionById } from "@/lib/asesores/auth";
import type { AsesorSession } from "@/lib/asesores/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/** Asesor comercial vinculado al usuario admin (gerente / director). */
export const getLinkedAsesorIdForAdminUser = async (
  adminUserId: string,
): Promise<string | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("asesor_id")
    .eq("id", adminUserId)
    .eq("activo", true)
    .maybeSingle();

  if (error || !data?.asesor_id) {
    return null;
  }

  return data.asesor_id as string;
};

export const getLinkedAsesorSessionForAdminUser = async (
  adminUserId: string,
): Promise<AsesorSession | null> => {
  const asesorId = await getLinkedAsesorIdForAdminUser(adminUserId);
  if (!asesorId) {
    return null;
  }

  return getAsesorSessionById(asesorId);
};
