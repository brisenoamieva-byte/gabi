import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { GABI_OPERADOR } from "@/lib/gabi/ecosystem";
import { getMasterSessionEmail } from "@/lib/gabi/master-session";
import { isGabiOperator } from "@/lib/gabi/operator";
import type { AdminProfile } from "@/lib/admin/types";

type AdminProfileRow = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  desarrollos_ids: string[] | null;
};

const normalizeAdminRol = (rol: string): AdminProfile["rol"] => {
  if (rol === "admin" || rol === "superadmin") {
    return "superadmin";
  }
  if (rol === "director" || rol === "gerente") {
    return "gerente";
  }
  if (rol === "operaciones") {
    return "operaciones";
  }
  return "operaciones";
};

function buildOwnerAdminSession(email: string): { userId: string; profile: AdminProfile } {
  return {
    userId: "operador-gabi",
    profile: {
      id: "operador-gabi",
      nombre: GABI_OPERADOR.nombre,
      email: email.trim().toLowerCase(),
      rol: "superadmin",
      activo: true,
      desarrollosIds: [],
    },
  };
}

const ADMIN_USER_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UUID de admin_profiles o null (operador master / ids sintéticos). */
export const resolveAdminUserIdForDb = (userId: string | null | undefined): string | null => {
  if (!userId || userId === "operador-gabi") {
    return null;
  }
  return ADMIN_USER_UUID.test(userId) ? userId : null;
};

export const getAdminSession = async (): Promise<{
  userId: string;
  profile: AdminProfile;
} | null> => {
  const masterEmail = await getMasterSessionEmail();
  if (masterEmail && isGabiOperator({ email: masterEmail })) {
    return buildOwnerAdminSession(masterEmail);
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profileClient = createSupabaseServiceClient() ?? supabase;

  const { data: profile, error } = await profileClient
    .from("admin_profiles")
    .select("id, nombre, email, rol, activo, desarrollos_ids")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  const row = profile as AdminProfileRow;

  return {
    userId: user.id,
    profile: {
      id: row.id,
      nombre: row.nombre,
      email: row.email,
      rol: normalizeAdminRol(row.rol),
      activo: row.activo,
      desarrollosIds: row.desarrollos_ids ?? [],
    },
  };
};
