import { getAsesorSessionById } from "@/lib/asesores/auth";
import { asesorSessionLookupIds } from "@/lib/asesores/seed-match";
import type { AsesorSession } from "@/lib/asesores/types";
import { canAdminOpenCampoCrm } from "@/lib/admin/campo-crm-access";
import type { AdminRol } from "@/lib/admin/types";
import { isGabiOperator } from "@/lib/gabi/operator";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type AsesorLookupRow = {
  id: string;
  nombre: string;
  email: string;
  rol: AsesorSession["rol"];
  activo: boolean;
  desarrollos_ids: string[];
};

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() ?? "";

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

/**
 * Ajusta desarrollos visibles en CRM de campo según alcance admin.
 * Si el perfil admin no tiene lista explícita, se respetan los del asesor vinculado
 * (ya no se expanden a “todos los activos del catálogo”).
 */
export const applyAdminScopeToAsesorSession = async (
  asesor: AsesorSession,
  adminRol: AdminRol,
  adminDesarrollosIds: string[],
): Promise<AsesorSession> => {
  if (adminDesarrollosIds.length) {
    if (adminRol === "superadmin" || adminRol === "gerente") {
      return {
        ...asesor,
        desarrollosIds: adminDesarrollosIds,
      };
    }
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
  const emailCandidates = Array.from(
    new Set([input.adminEmail, input.authEmail].map(normalizeEmail).filter(Boolean)),
  );
  const isOperator = emailCandidates.some((email) => isGabiOperator({ email }));
  /** Operador gabi abre CRM de campo; alcance = perfil admin o asignaciones del asesor vinculado. */
  const effectiveRol: AdminRol = isOperator ? "superadmin" : adminRol;
  const effectiveDesarrollosIds = adminDesarrollosIds;

  if (!canAdminOpenCampoCrm(effectiveRol) && !isOperator) {
    return null;
  }

  let asesor: AsesorSession | null = await getLinkedAsesorSessionForAdminUser(input.adminUserId);

  if (!asesor) {
    for (const email of emailCandidates) {
      const byEmail = await findAsesorSessionByEmail(email);
      if (byEmail) {
        asesor = byEmail;
        break;
      }
    }
  }

  if (!asesor && (effectiveRol === "superadmin" || isOperator)) {
    asesor = await findOperatorSeedAsesorSession();
  }

  if (!asesor) {
    return null;
  }

  return applyAdminScopeToAsesorSession(asesor, effectiveRol, effectiveDesarrollosIds);
};

/** Sesión CRM de campo para operador gabi autenticado con cookie master (sin Supabase). */
export const resolveCampoAsesorSessionForMasterOperator = async (
  email: string,
): Promise<AsesorSession | null> =>
  resolveCampoAsesorSessionForAdminUser({
    adminUserId: "operador-gabi",
    adminEmail: email,
    adminRol: "superadmin",
    adminDesarrollosIds: [],
    authEmail: email,
  });
