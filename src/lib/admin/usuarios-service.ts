import type { AdminRol } from "@/lib/admin/types";
import { ensureAuthUserForAdmin } from "@/lib/admin/admin-auth-user";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type AdminUserRecord = {
  id: string;
  nombre: string;
  email: string;
  rol: AdminRol;
  activo: boolean;
  desarrollosIds: string[];
  asesorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserInput = {
  nombre: string;
  email: string;
  rol: AdminRol;
  desarrollosIds?: string[];
  activo?: boolean;
};

export type AdminUserUpdateInput = Partial<Omit<AdminUserInput, "email">> & {
  desarrollosIds?: string[];
};

const normalizeRol = (rol: string): AdminRol => {
  if (rol === "superadmin" || rol === "admin") {
    return "superadmin";
  }
  if (rol === "gerente" || rol === "director") {
    return "gerente";
  }
  return "operaciones";
};

const toRecord = (row: {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  desarrollos_ids: string[] | null;
  asesor_id: string | null;
  created_at: string;
  updated_at: string;
}): AdminUserRecord => ({
  id: row.id,
  nombre: row.nombre,
  email: row.email,
  rol: normalizeRol(row.rol),
  activo: row.activo,
  desarrollosIds: row.desarrollos_ids ?? [],
  asesorId: row.asesor_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const resolveAuthUserId = async (email: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { data: linkedProfile } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (linkedProfile?.id) {
    return { userId: linkedProfile.id as string, invited: false };
  }

  const { userId, created } = await ensureAuthUserForAdmin(normalizedEmail);
  return { userId, invited: created };
};

const validateDesarrollosForRol = (rol: AdminRol, desarrollosIds: string[]) => {
  if (rol === "superadmin") {
    return;
  }

  if (!desarrollosIds.length) {
    throw new Error("Asigna al menos un desarrollo para gerente u operaciones.");
  }
};

export const listAdminUsers = async (): Promise<AdminUserRecord[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, nombre, email, rol, activo, desarrollos_ids, asesor_id, created_at, updated_at")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(toRecord);
};

export const createAdminUser = async (
  input: AdminUserInput,
): Promise<{ user: AdminUserRecord; invited: boolean }> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  if (!input.nombre.trim() || !input.email.trim()) {
    throw new Error("Nombre y email son obligatorios.");
  }

  const desarrollosIds = input.desarrollosIds ?? [];
  validateDesarrollosForRol(input.rol, desarrollosIds);

  const { userId, invited } = await resolveAuthUserId(input.email);

  const { data, error } = await supabase
    .from("admin_profiles")
    .upsert(
      {
        id: userId,
        nombre: input.nombre.trim(),
        email: input.email.trim().toLowerCase(),
        rol: input.rol,
        desarrollos_ids: input.rol === "superadmin" ? [] : desarrollosIds,
        activo: input.activo ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id, nombre, email, rol, activo, desarrollos_ids, asesor_id, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear el usuario admin.");
  }

  return { user: toRecord(data), invited };
};

export const updateAdminUser = async (
  id: string,
  input: AdminUserUpdateInput,
  actorId: string,
): Promise<AdminUserRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("admin_profiles")
    .select("id, nombre, email, rol, activo, desarrollos_ids, asesor_id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    throw new Error("Usuario admin no encontrado.");
  }

  const nextRol = input.rol ?? normalizeRol(existing.rol as string);
  const nextDesarrollos =
    input.desarrollosIds ??
    ((existing.desarrollos_ids ?? []) as string[]);
  const nextActivo = input.activo ?? (existing.activo as boolean);

  if (id === actorId && nextActivo === false) {
    throw new Error("No puedes desactivar tu propia cuenta.");
  }

  if (id === actorId && nextRol !== "superadmin" && normalizeRol(existing.rol as string) === "superadmin") {
    throw new Error("No puedes quitarte el rol de superadmin.");
  }

  validateDesarrollosForRol(nextRol, nextDesarrollos);

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    rol: nextRol,
    activo: nextActivo,
    desarrollos_ids: nextRol === "superadmin" ? [] : nextDesarrollos,
  };

  if (input.nombre !== undefined) {
    if (!input.nombre.trim()) {
      throw new Error("El nombre es obligatorio.");
    }
    patch.nombre = input.nombre.trim();
  }

  const { data, error } = await supabase
    .from("admin_profiles")
    .update(patch)
    .eq("id", id)
    .select("id, nombre, email, rol, activo, desarrollos_ids, asesor_id, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo actualizar.");
  }

  return toRecord(data);
};
