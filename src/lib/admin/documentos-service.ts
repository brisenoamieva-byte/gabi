import { sameDocumentoAlcance, type DocumentoAlcanceKey } from "@/lib/admin/documentos-scope";
import { canAccessDesarrollo, isSuperAdmin } from "@/lib/admin/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AdminProfile, DocumentoRecord, DocumentoTipo } from "@/lib/admin/types";

const BUCKET = "gabi-documentos";

export const getDocumentoById = async (id: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as DocumentoRecord | null) ?? null;
};

export const listDocumentos = async (
  profile: AdminProfile,
  desarrolloId?: string,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  if (desarrolloId && !canAccessDesarrollo(profile, desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  let query = supabase
    .from("documentos")
    .select("*")
    .order("created_at", { ascending: false });

  if (desarrolloId) {
    query = query.eq("desarrollo_id", desarrolloId);
  } else if (!isSuperAdmin(profile)) {
    if (!profile.desarrollosIds.length) {
      return [];
    }
    query = query.in("desarrollo_id", profile.desarrollosIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DocumentoRecord[];
};

export const resolveDocumentoOficial = async (filters: {
  desarrolloId: string;
  clusterId?: string;
  etapa?: string;
  prototipoId?: string;
  tipo: DocumentoTipo;
}) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const tryMatch = async (etapa: string | null | undefined) => {
    let query = supabase
      .from("documentos")
      .select("public_url, nombre_archivo, nombre")
      .eq("activo", true)
      .eq("desarrollo_id", filters.desarrolloId)
      .eq("tipo", filters.tipo)
      .order("created_at", { ascending: false })
      .limit(1);

    if (filters.tipo === "ficha_tecnica" && filters.prototipoId) {
      query = query.eq("prototipo_id", filters.prototipoId);
    } else if (filters.tipo === "brochure_desarrollo" || filters.tipo === "master_plan") {
      if (filters.clusterId) {
        query = query.eq("cluster_id", filters.clusterId).is("prototipo_id", null).is("etapa", null);
      } else {
        query = query.is("cluster_id", null).is("etapa", null).is("prototipo_id", null);
      }
    } else if (filters.clusterId) {
      query = query.eq("cluster_id", filters.clusterId).is("prototipo_id", null);
      if (etapa) {
        query = query.eq("etapa", etapa);
      } else {
        query = query.is("etapa", null);
      }
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      return null;
    }
    return data as Pick<DocumentoRecord, "public_url" | "nombre_archivo" | "nombre">;
  };

  if (filters.tipo === "ficha_tecnica") {
    return tryMatch(null);
  }

  if (filters.etapa && filters.clusterId) {
    const exact = await tryMatch(filters.etapa);
    if (exact) {
      return exact;
    }
  }

  return tryMatch(null);
};

export const resolveMasterPlanDocumento = async (desarrolloId: string, clusterId?: string) =>
  resolveDocumentoOficial({
    desarrolloId,
    clusterId,
    tipo: "master_plan",
  });

export const findDocumentoActivoEnAlcance = async (key: DocumentoAlcanceKey) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  let query = supabase
    .from("documentos")
    .select("*")
    .eq("desarrollo_id", key.desarrolloId)
    .eq("tipo", key.tipo)
    .eq("activo", true)
    .order("created_at", { ascending: false });

  if (key.tipo === "ficha_tecnica" && key.prototipoId) {
    query = query.eq("prototipo_id", key.prototipoId);
  } else if (key.tipo === "brochure_desarrollo" || key.tipo === "master_plan") {
    if (key.clusterId) {
      query = query.eq("cluster_id", key.clusterId).is("prototipo_id", null).is("etapa", null);
    } else {
      query = query.is("cluster_id", null).is("etapa", null).is("prototipo_id", null);
    }
  } else if (key.clusterId) {
    query = query.eq("cluster_id", key.clusterId).is("prototipo_id", null);
    if (key.etapa) {
      query = query.eq("etapa", key.etapa);
    } else {
      query = query.is("etapa", null);
    }
  } else {
    query = query.is("cluster_id", null).is("etapa", null).is("prototipo_id", null);
  }

  const { data, error } = await query.limit(5);
  if (error) {
    throw new Error(error.message);
  }

  const records = (data ?? []) as DocumentoRecord[];
  return records.find((doc) => sameDocumentoAlcance(doc, key)) ?? null;
};

export const deactivateDocumentosAnteriores = async (filters: {
  desarrolloId: string;
  clusterId: string | null;
  etapa: string | null;
  prototipoId: string | null;
  tipo: DocumentoTipo;
}) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  let query = supabase
    .from("documentos")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("desarrollo_id", filters.desarrolloId)
    .eq("tipo", filters.tipo)
    .eq("activo", true);

  if (filters.tipo === "ficha_tecnica" && filters.prototipoId) {
    query = query.eq("prototipo_id", filters.prototipoId);
  } else if (filters.clusterId) {
    query = query.eq("cluster_id", filters.clusterId).is("prototipo_id", null);
    if (filters.etapa) {
      query = query.eq("etapa", filters.etapa);
    } else {
      query = query.is("etapa", null);
    }
  } else {
    query = query.is("cluster_id", null).is("etapa", null).is("prototipo_id", null);
  }

  const { error } = await query;
  if (error) {
    throw new Error(error.message);
  }
};

export const uploadDocumento = async (input: {
  confirmReplace?: boolean;
  file: File;
  desarrolloId: string;
  clusterId: string | null;
  etapa: string | null;
  prototipoId: string | null;
  tipo: DocumentoTipo;
  nombre: string;
  adminId: string;
}) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const isPdf =
    input.file.type === "application/pdf" ||
    input.file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error("Solo se permiten archivos PDF.");
  }

  const alcanceKey: DocumentoAlcanceKey = {
    desarrolloId: input.desarrolloId,
    clusterId: input.clusterId,
    etapa: input.etapa?.trim() || null,
    prototipoId: input.prototipoId,
    tipo: input.tipo,
  };

  const existing = await findDocumentoActivoEnAlcance(alcanceKey);
  if (existing && !input.confirmReplace) {
    const conflict = new Error("DOCUMENTO_ALREADY_EXISTS") as Error & {
      code: "DOCUMENTO_ALREADY_EXISTS";
      existing: DocumentoRecord;
    };
    conflict.code = "DOCUMENTO_ALREADY_EXISTS";
    conflict.existing = existing;
    throw conflict;
  }

  const safeName = input.file.name.replace(/[^\w.\-() ]+/g, "_");
  const scope = input.prototipoId
    ? input.prototipoId
    : input.clusterId
      ? input.etapa
        ? `${input.clusterId}-${input.etapa}`
        : input.clusterId
      : "general";
  const storagePath = `${input.desarrolloId}/${input.tipo}/${scope}/${Date.now()}-${safeName}`;

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  await deactivateDocumentosAnteriores({
    desarrolloId: input.desarrolloId,
    clusterId: input.clusterId,
    etapa: alcanceKey.etapa,
    prototipoId: input.prototipoId,
    tipo: input.tipo,
  });

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      desarrollo_id: input.desarrolloId,
      cluster_id: input.clusterId,
      etapa: alcanceKey.etapa,
      prototipo_id: input.prototipoId,
      tipo: input.tipo,
      nombre: input.nombre,
      nombre_archivo: safeName,
      storage_path: storagePath,
      public_url: publicData.publicUrl,
      tamano_bytes: input.file.size,
      subido_por: input.adminId,
      activo: true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as DocumentoRecord;
};

export const setDocumentoActivo = async (
  profile: AdminProfile,
  id: string,
  activo: boolean,
) => {
  const documento = await getDocumentoById(id);
  if (!documento) {
    throw new Error("Documento no encontrado.");
  }

  if (!canAccessDesarrollo(profile, documento.desarrollo_id)) {
    throw new Error("No tienes permiso para este documento.");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { error } = await supabase
    .from("documentos")
    .update({ activo, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};
