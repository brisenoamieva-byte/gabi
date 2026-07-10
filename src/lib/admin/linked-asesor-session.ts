import { getAsesorSessionById } from "@/lib/asesores/auth";
import { asesorSessionLookupIds } from "@/lib/asesores/seed-match";
import type { AsesorSession } from "@/lib/asesores/types";
import type { AdminRol } from "@/lib/admin/types";
import { isGabiOperator } from "@/lib/gabi/operator";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type AsesorLookupRow = {
  id: string;
  nombre: string;
  email: string;
  rol: AsesorSession["rol"];
  activo: boolean;
  desarrollos_ids: string[];
};

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() ?? "";

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

const findAsesorSessionByEmail = async (email: string): Promise<AsesorSession | null> => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return null;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("asesores")
    .select("id, nombre, email, rol, activo, desarrollos_ids")
    .eq("activo", true)
    .ilike("email", normalized)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return getAsesorSessionById((data as AsesorLookupRow).id);
};

const findOperatorSeedAsesorSession = async (): Promise<AsesorSession | null> => {
  for (const candidateId of ["rbriseno", "ricardo"]) {
    for (const lookupId of asesorSessionLookupIds(candidateId)) {
      const session = await getAsesorSessionById(lookupId);
      if (session) {
        return session;
      }
    }
  }
  return null;
};

export const persistAdminAsesorLink = async (
  adminUserId: string,
  asesorId: string,
): Promise<void> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  await supabase
    .from("admin_profiles")
    .update({
      asesor_id: asesorId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", adminUserId);
};

/**
 * Resuelve la sesión de asesor para abrir el CRM de campo desde admin.
 * Orden: vínculo explícito → mismo correo → operador gabi (superadmin).
 */
export const resolveCampoAsesorSessionForAdminUser = async (input: {
  adminUserId: string;
  adminEmail?: string | null;
  adminRol?: AdminRol;
  authEmail?: string | null;
}): Promise<AsesorSession | null> => {
  const linked = await getLinkedAsesorSessionForAdminUser(input.adminUserId);
  if (linked) {
    return linked;
  }

  const emailCandidates = Array.from(
    new Set([input.adminEmail, input.authEmail].map(normalizeEmail).filter(Boolean)),
  );

  for (const email of emailCandidates) {
    const byEmail = await findAsesorSessionByEmail(email);
    if (byEmail) {
      return byEmail;
    }
  }

  if (
    input.adminRol === "superadmin" &&
    emailCandidates.some((email) => isGabiOperator({ email }))
  ) {
    const operatorAsesor = await findOperatorSeedAsesorSession();
    if (operatorAsesor) {
      return operatorAsesor;
    }
  }

  if (input.adminRol === "superadmin") {
    return findOperatorSeedAsesorSession();
  }

  return null;
};
