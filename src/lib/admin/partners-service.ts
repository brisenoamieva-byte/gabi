import { canAccessDesarrollo } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import {
  isPartnerTipo,
  type PartnerRecord,
  type PartnerTipo,
} from "@/lib/admin/partners-types";
import { getDesarrolloById } from "@/lib/catalog/service";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type {
  PartnerRecord,
  PartnerTipo,
} from "@/lib/admin/partners-types";
export {
  PARTNER_TIPOS,
  isPartnerTipo,
  partnerTipoLabel,
} from "@/lib/admin/partners-types";

export type PartnerInput = {
  /** Preferido: resuelve comercializadora y valida permiso. */
  desarrolloId?: string;
  comercializadoraId?: string;
  nombre: string;
  tipo?: PartnerTipo;
  contactoNombre?: string;
  telefono?: string;
  email?: string;
  notas?: string;
  activo?: boolean;
};

export type UpdatePartnerInput = {
  nombre?: string;
  tipo?: PartnerTipo;
  contactoNombre?: string | null;
  telefono?: string | null;
  email?: string | null;
  notas?: string | null;
  activo?: boolean;
};

async function resolveComercializadoraId(input: {
  desarrolloId?: string;
  comercializadoraId?: string;
  profile?: AdminProfile;
}): Promise<string> {
  if (input.desarrolloId) {
    if (input.profile && !canAccessDesarrollo(input.profile, input.desarrolloId)) {
      throw new Error("No tienes permiso para este desarrollo.");
    }
    const desarrollo = await getDesarrolloById(input.desarrolloId);
    if (!desarrollo?.comercializadoraId) {
      throw new Error("No se pudo resolver la comercializadora del desarrollo.");
    }
    return desarrollo.comercializadoraId;
  }

  if (input.comercializadoraId?.trim()) {
    return input.comercializadoraId.trim();
  }

  throw new Error("Indica desarrolloId o comercializadoraId.");
}

export const listPartners = async (
  filters: {
    desarrolloId?: string;
    comercializadoraId?: string;
    activoOnly?: boolean;
  },
  profile?: AdminProfile,
): Promise<PartnerRecord[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const comercializadoraId = await resolveComercializadoraId({
    desarrolloId: filters.desarrolloId,
    comercializadoraId: filters.comercializadoraId,
    profile,
  });

  let query = supabase
    .from("partners")
    .select("*")
    .eq("comercializadora_id", comercializadoraId)
    .order("nombre", { ascending: true });

  if (filters.activoOnly) {
    query = query.eq("activo", true);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PartnerRecord[];
};

export const createPartner = async (
  input: PartnerInput,
  profile?: AdminProfile,
): Promise<PartnerRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const comercializadoraId = await resolveComercializadoraId({
    desarrolloId: input.desarrolloId,
    comercializadoraId: input.comercializadoraId,
    profile,
  });

  const nombre = input.nombre.trim();
  if (!nombre) {
    throw new Error("El nombre del aliado es obligatorio.");
  }

  const tipo = input.tipo ?? "inmobiliaria";
  if (!isPartnerTipo(tipo)) {
    throw new Error("Tipo de aliado inválido.");
  }

  const { data, error } = await supabase
    .from("partners")
    .insert({
      comercializadora_id: comercializadoraId,
      tipo,
      nombre,
      contacto_nombre: input.contactoNombre?.trim() || null,
      telefono: input.telefono?.trim() || null,
      email: input.email?.trim() || null,
      notas: input.notas?.trim() || null,
      activo: input.activo ?? true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PartnerRecord;
};

export const updatePartner = async (
  id: string,
  input: UpdatePartnerInput,
  profile?: AdminProfile,
): Promise<PartnerRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("partners")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }
  if (!existing) {
    throw new Error("Aliado no encontrado.");
  }

  if (profile) {
    // Valida acceso vía cualquier desarrollo de la comercializadora del partner.
    const { data: desarrollo, error: desarrolloError } = await supabase
      .from("desarrollos_catalog")
      .select("id")
      .eq("comercializadora_id", existing.comercializadora_id)
      .eq("activo", true)
      .limit(50);

    if (desarrolloError) {
      throw new Error(desarrolloError.message);
    }

    const allowed = (desarrollo ?? []).some((row) =>
      canAccessDesarrollo(profile, row.id as string),
    );
    if (!allowed) {
      throw new Error("No tienes permiso para este aliado.");
    }
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
  if (input.tipo !== undefined) {
    if (!isPartnerTipo(input.tipo)) {
      throw new Error("Tipo de aliado inválido.");
    }
    patch.tipo = input.tipo;
  }
  if (input.contactoNombre !== undefined) {
    patch.contacto_nombre = input.contactoNombre?.trim() || null;
  }
  if (input.telefono !== undefined) {
    patch.telefono = input.telefono?.trim() || null;
  }
  if (input.email !== undefined) {
    patch.email = input.email?.trim() || null;
  }
  if (input.notas !== undefined) {
    patch.notas = input.notas?.trim() || null;
  }
  if (input.activo !== undefined) {
    patch.activo = input.activo;
  }

  const { data, error } = await supabase
    .from("partners")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PartnerRecord;
};
