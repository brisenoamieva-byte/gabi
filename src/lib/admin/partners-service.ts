import { resolveAdminUserIdForDb } from "@/lib/admin/admin-user-id";
import type { PartnerRecord, PartnerTipo } from "@/lib/admin/partners-types";
import { isPartnerTipo } from "@/lib/admin/partners-types";
import { getDesarrolloById } from "@/lib/catalog/service";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { canAccessDesarrollo } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";

export type {
  PartnerRecord,
  PartnerTipo,
} from "@/lib/admin/partners-types";
export {
  PARTNER_TIPOS,
  isPartnerTipo,
  partnerTipoLabel,
} from "@/lib/admin/partners-types";

const DOCUMENTOS_BUCKET = "gabi-documentos";
const MAX_CONVENIO_BYTES = 25 * 1024 * 1024;

const mapPartner = (row: Record<string, unknown>): PartnerRecord => ({
  id: row.id as string,
  comercializadora_id: row.comercializadora_id as string,
  tipo: row.tipo as PartnerTipo,
  nombre: row.nombre as string,
  contacto_nombre: (row.contacto_nombre as string | null) ?? null,
  telefono: (row.telefono as string | null) ?? null,
  email: (row.email as string | null) ?? null,
  notas: (row.notas as string | null) ?? null,
  activo: Boolean(row.activo),
  convenio_storage_path: (row.convenio_storage_path as string | null) ?? null,
  convenio_public_url: (row.convenio_public_url as string | null) ?? null,
  convenio_nombre_archivo: (row.convenio_nombre_archivo as string | null) ?? null,
  convenio_subido_at: (row.convenio_subido_at as string | null) ?? null,
  convenio_subido_por: (row.convenio_subido_por as string | null) ?? null,
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
});

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

async function assertComercializadoraAccess(
  comercializadoraId: string,
  profile?: AdminProfile,
): Promise<void> {
  if (!profile) {
    return;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase
    .from("desarrollos_catalog")
    .select("id")
    .eq("comercializadora_id", comercializadoraId)
    .eq("activo", true)
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const allowed = (data ?? []).some((row) => canAccessDesarrollo(profile, row.id as string));
  if (!allowed) {
    throw new Error("No tienes permiso para esta comercializadora.");
  }
}

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
    const comercializadoraId = input.comercializadoraId.trim();
    await assertComercializadoraAccess(comercializadoraId, input.profile);
    return comercializadoraId;
  }

  throw new Error("Indica desarrolloId o comercializadoraId.");
}

async function getPartnerOrThrow(
  id: string,
  profile?: AdminProfile,
): Promise<PartnerRecord> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase.from("partners").select("*").eq("id", id).maybeSingle();

  if (error) {
    if (error.message.includes("convenio_") || error.code === "PGRST204") {
      throw new Error("Falta aplicar la migración 067_partners_convenio.sql en Supabase.");
    }
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Aliado no encontrado.");
  }

  const partner = mapPartner(data as Record<string, unknown>);
  await assertComercializadoraAccess(partner.comercializadora_id, profile);
  return partner;
}

export const listPartners = async (
  filters: {
    desarrolloId?: string;
    comercializadoraId?: string;
    activoOnly?: boolean;
    /**
     * Solo aliados con al menos un prospecto activo ligado en el desarrollo
     * (no el catálogo completo de la comercializadora).
     */
    usedInDesarrolloOnly?: boolean;
  },
  profile?: AdminProfile,
): Promise<PartnerRecord[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  if (filters.usedInDesarrolloOnly) {
    if (!filters.desarrolloId) {
      throw new Error("desarrolloId requerido para aliados del desarrollo.");
    }
    if (profile && !canAccessDesarrollo(profile, filters.desarrolloId)) {
      throw new Error("No tienes permiso para este desarrollo.");
    }
    return listPartnersUsedInDesarrollo(filters.desarrolloId, {
      activoOnly: filters.activoOnly,
    });
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
    if (error.message.includes("convenio_") || error.code === "PGRST204") {
      throw new Error("Falta aplicar la migración 067_partners_convenio.sql en Supabase.");
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapPartner(row as Record<string, unknown>));
};

/** Aliados ya ligados a prospectos (o ventas) del desarrollo. */
const listPartnersUsedInDesarrollo = async (
  desarrolloId: string,
  options?: { activoOnly?: boolean },
): Promise<PartnerRecord[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data: prospectoRows, error: prospectoError } = await supabase
    .from("prospectos")
    .select("partner_id")
    .eq("desarrollo_id", desarrolloId)
    .eq("activo", true)
    .not("partner_id", "is", null);

  if (prospectoError) {
    throw new Error(prospectoError.message);
  }

  const partnerIds = Array.from(
    new Set(
      (prospectoRows ?? [])
        .map((row) => (row.partner_id ? String(row.partner_id) : ""))
        .filter(Boolean),
    ),
  );

  if (!partnerIds.length) {
    return [];
  }

  let query = supabase
    .from("partners")
    .select("*")
    .in("id", partnerIds)
    .order("nombre", { ascending: true });

  if (options?.activoOnly) {
    query = query.eq("activo", true);
  }

  const { data, error } = await query;
  if (error) {
    if (error.message.includes("convenio_") || error.code === "PGRST204") {
      throw new Error("Falta aplicar la migración 067_partners_convenio.sql en Supabase.");
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapPartner(row as Record<string, unknown>));
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

  return mapPartner(data as Record<string, unknown>);
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

  await getPartnerOrThrow(id, profile);

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

  return mapPartner(data as Record<string, unknown>);
};

export const uploadPartnerConvenio = async (
  partnerId: string,
  file: File,
  profile: AdminProfile,
): Promise<PartnerRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const partner = await getPartnerOrThrow(partnerId, profile);

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw new Error("El convenio debe ser un PDF.");
  }
  if (file.size <= 0 || file.size > MAX_CONVENIO_BYTES) {
    throw new Error("El PDF debe pesar entre 1 byte y 25 MB.");
  }

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_") || "convenio.pdf";
  const storagePath = `partners/${partner.comercializadora_id}/${partner.id}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  if (partner.convenio_storage_path) {
    await supabase.storage.from(DOCUMENTOS_BUCKET).remove([partner.convenio_storage_path]);
  }

  const { data: publicData } = supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from("partners")
    .update({
      convenio_storage_path: storagePath,
      convenio_public_url: publicData.publicUrl,
      convenio_nombre_archivo: safeName,
      convenio_subido_at: new Date().toISOString(),
      convenio_subido_por: resolveAdminUserIdForDb(profile.id),
      updated_at: new Date().toISOString(),
    })
    .eq("id", partnerId)
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(DOCUMENTOS_BUCKET).remove([storagePath]);
    if (error.message.includes("convenio_") || error.code === "PGRST204") {
      throw new Error("Falta aplicar la migración 067_partners_convenio.sql en Supabase.");
    }
    throw new Error(error.message);
  }

  return mapPartner(data as Record<string, unknown>);
};

export const removePartnerConvenio = async (
  partnerId: string,
  profile: AdminProfile,
): Promise<PartnerRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const partner = await getPartnerOrThrow(partnerId, profile);

  if (partner.convenio_storage_path) {
    await supabase.storage.from(DOCUMENTOS_BUCKET).remove([partner.convenio_storage_path]);
  }

  const { data, error } = await supabase
    .from("partners")
    .update({
      convenio_storage_path: null,
      convenio_public_url: null,
      convenio_nombre_archivo: null,
      convenio_subido_at: null,
      convenio_subido_por: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", partnerId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPartner(data as Record<string, unknown>);
};
