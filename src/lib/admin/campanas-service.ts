import { canAccessDesarrollo } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type CampanaTipo = "online" | "offline";

export type CampanaRecord = {
  id: string;
  desarrollo_id: string;
  nombre: string;
  canal: string | null;
  tipo: CampanaTipo;
  parseur_email: string | null;
  meta_lead_form_id: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type CampanaInput = {
  desarrolloId: string;
  nombre: string;
  canal?: string;
  tipo?: CampanaTipo;
  parseurEmail?: string;
  activo?: boolean;
};

export type UpdateCampanaInput = {
  nombre?: string;
  canal?: string;
  tipo?: CampanaTipo;
  parseurEmail?: string | null;
  metaLeadFormId?: string | null;
  activo?: boolean;
};

export const listCampanas = async (
  filters: { desarrolloId: string; activoOnly?: boolean },
  profile?: AdminProfile,
): Promise<CampanaRecord[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  if (profile && !canAccessDesarrollo(profile, filters.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  let query = supabase
    .from("campanas")
    .select("*")
    .eq("desarrollo_id", filters.desarrolloId)
    .order("nombre", { ascending: true });

  if (filters.activoOnly) {
    query = query.eq("activo", true);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CampanaRecord[];
};

export const createCampana = async (input: CampanaInput, profile?: AdminProfile) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  if (profile && !canAccessDesarrollo(profile, input.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const nombre = input.nombre.trim();
  if (!nombre) {
    throw new Error("El nombre de la campaña es obligatorio.");
  }

  const { data, error } = await supabase
    .from("campanas")
    .insert({
      desarrollo_id: input.desarrolloId,
      nombre,
      canal: input.canal?.trim() || null,
      tipo: input.tipo ?? "online",
      parseur_email: input.parseurEmail?.trim() || null,
      activo: input.activo ?? true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CampanaRecord;
};

export const updateCampana = async (
  id: string,
  input: UpdateCampanaInput,
  profile?: AdminProfile,
): Promise<CampanaRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("campanas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }
  if (!existing) {
    throw new Error("Campaña no encontrada.");
  }

  if (profile && !canAccessDesarrollo(profile, existing.desarrollo_id)) {
    throw new Error("No tienes permiso para esta campaña.");
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.nombre !== undefined) {
    const nombre = input.nombre.trim();
    if (!nombre) {
      throw new Error("El nombre es obligatorio.");
    }
    patch.nombre = nombre;
  }
  if (input.canal !== undefined) {
    patch.canal = input.canal.trim() || null;
  }
  if (input.tipo !== undefined) {
    patch.tipo = input.tipo;
  }
  if (input.parseurEmail !== undefined) {
    patch.parseur_email = input.parseurEmail?.trim() || null;
  }
  if (input.metaLeadFormId !== undefined) {
    patch.meta_lead_form_id = input.metaLeadFormId?.trim() || null;
  }
  if (input.activo !== undefined) {
    patch.activo = input.activo;
  }

  const { data, error } = await supabase
    .from("campanas")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CampanaRecord;
};
