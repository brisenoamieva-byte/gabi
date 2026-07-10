import { getAsesorSessionById } from "@/lib/asesores/auth";
import { asesorSessionLookupIds } from "@/lib/asesores/seed-match";
import type { AsesorSession } from "@/lib/asesores/types";
import { canAdminOpenCampoCrm } from "@/lib/admin/campo-crm-access";
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

const fetchAllActiveDesarrolloIds = async (): Promise<string[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("desarrollos_catalog")
    .select("id")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => row.id as string);
};

/** Admin gerente / director comercial con acceso al CRM de campo desde backoffice. */
export { canAdminOpenCampoCrm } from "@/lib/admin/campo-crm-access";

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

/** Ajusta desarrollos visibles en CRM según alcance admin (superadmin = todos, gerente/director = asignados). */
export const applyAdminScopeToAsesorSession = async (
  asesor: AsesorSession,
  adminRol: AdminRol,
  adminDesarrollosIds: string[],
): Promise<AsesorSession> => {
  if (adminRol === "superadmin") {
    const desarrollosIds = adminDesarrollosIds.length
      ? adminDesarrollosIds
      : await fetchAllActiveDesarrolloIds();

    return {
      ...asesor,
      desarrollosIds: desarrollosIds.length ? desarrollosIds : asesor.desarrollosIds,
    };
  }

  if (adminRol === "gerente" && adminDesarrollosIds.length) {
    return {
      ...asesor,
      desarrollosIds: adminDesarrollosIds,
    };
  }

  return asesor;
};

/**
 * Resuelve la sesión de asesor para abrir el CRM de campo desde admin.
 * Orden: vínculo explícito → mismo correo → operador gabi (solo superadmin).
 */
export const resolveCampoAsesorSessionForAdminUser = async (input: {
  adminUserId: string;
  adminEmail?: string | null;
  adminRol?: AdminRol;
  adminDesarrollosIds?: string[];
  authEmail?: string | null;
}): Promise<AsesorSession | null> => {
  const adminRol = input.adminRol ?? "operaciones";
  const adminDesarrollosIds = input.adminDesarrollosIds ?? [];

  if (!canAdminOpenCampoCrm(adminRol)) {
    return null;
  }

  let asesor: AsesorSession | null = await getLinkedAsesorSessionForAdminUser(input.adminUserId);

  if (!asesor) {
    const emailCandidates = Array.from(
      new Set([input.adminEmail, input.authEmail].map(normalizeEmail).filter(Boolean)),
    );

    for (const email of emailCandidates) {
      const byEmail = await findAsesorSessionByEmail(email);
      if (byEmail) {
        asesor = byEmail;
        break;
      }
    }
  }

  if (!asesor && adminRol === "superadmin") {
    if (
      [input.adminEmail, input.authEmail]
        .map(normalizeEmail)
        .some((email) => email && isGabiOperator({ email }))
    ) {
      asesor = await findOperatorSeedAsesorSession();
    }
    if (!asesor) {
      asesor = await findOperatorSeedAsesorSession();
    }
  }

  if (!asesor) {
    return null;
  }

  return applyAdminScopeToAsesorSession(asesor, adminRol, adminDesarrollosIds);
};
