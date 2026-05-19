import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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
  return "superadmin";
};

export const getAdminSession = async (): Promise<{
  userId: string;
  profile: AdminProfile;
} | null> => {
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

  // Service role evita recursión RLS en admin_profiles (migración 006).
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
