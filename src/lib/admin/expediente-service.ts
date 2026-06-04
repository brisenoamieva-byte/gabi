import { assertDesarrolloAccess, canAccessDesarrollo, isSuperAdmin } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import {
  computeChecklistProgreso,
  getExpedienteChecklist,
  resolveChecklistCodigo,
  type ExpedienteChecklistEtapa,
} from "@/lib/comercial/expediente-checklist";
import type { OperacionComercialRecord } from "@/lib/comercial/sembrado-status";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  getGoogleDriveOperacionFolderUrl,
  isGoogleDriveConfiguredForDesarrollo,
} from "@/lib/integrations/google-drive-config";
import { uploadExpedienteToGoogleDrive } from "@/lib/integrations/google-drive-service";

const BUCKET = "gabi-expedientes";
const SIGNED_URL_TTL_SECONDS = 60 * 15;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type ExpedienteDocumentoRecord = {
  id: string;
  operacion_id: string;
  desarrollo_id: string;
  prospecto_id: string | null;
  tipo: string;
  checklist_codigo: string;
  etapa_checklist: string | null;
  nombre: string;
  nombre_archivo: string;
  storage_path: string;
  mime_type: string;
  tamano_bytes: number | null;
  activo: boolean;
  subido_por: string | null;
  notas: string | null;
  drive_file_id?: string | null;
  drive_web_view_link?: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpedienteListRow = {
  operacionId: string;
  desarrolloId: string;
  clienteNombre: string;
  unidadNumero: string;
  estatusSembrado: string;
  escriturado: boolean;
  engancheCubierto: boolean;
  documentosSubidos: number;
  documentosRequeridos: number;
  progresoPct: number;
  formalizacionPct: number;
  updatedAt: string;
};

export type ExpedienteDetail = {
  operacion: OperacionComercialRecord;
  unidadNumero: string;
  documentos: ExpedienteDocumentoRecord[];
  progreso: ReturnType<typeof computeChecklistProgreso>;
  checklist: ReturnType<typeof getExpedienteChecklist>;
  driveFolderUrl: string | null;
  driveConfigured: boolean;
};

const assertMime = (file: File) => {
  const mime =
    file.type ||
    (file.name.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : file.name.toLowerCase().endsWith(".png")
        ? "image/png"
        : file.name.toLowerCase().endsWith(".webp")
          ? "image/webp"
          : "image/jpeg");

  if (!ALLOWED_MIME.has(mime)) {
    throw new Error("Formato no permitido. Usa PDF, JPG, PNG o WEBP.");
  }

  return mime;
};

const mapDocumento = (row: Record<string, unknown>): ExpedienteDocumentoRecord => {
  const codigo = (row.checklist_codigo as string) || resolveChecklistCodigo(row.tipo as string);
  return { ...(row as ExpedienteDocumentoRecord), checklist_codigo: codigo };
};

export const listExpedientes = async (
  desarrolloId: string,
  profile: AdminProfile,
): Promise<ExpedienteListRow[]> => {
  assertDesarrolloAccess(profile, desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data: operaciones, error: operacionesError } = await supabase
    .from("operaciones_comerciales")
    .select(
      "id, desarrollo_id, cliente_nombre, estatus_sembrado, escriturado, unidad_id, updated_at, enganche_cubierto, persona_moral",
    )
    .eq("desarrollo_id", desarrolloId)
    .eq("cancelada", false)
    .neq("estatus_sembrado", "Disponibles")
    .order("updated_at", { ascending: false });

  if (operacionesError) {
    throw new Error(operacionesError.message);
  }

  const ops = operaciones ?? [];
  if (!ops.length) {
    return [];
  }

  const unidadIds = Array.from(new Set(ops.map((row) => row.unidad_id as string)));
  const { data: unidades, error: unidadesError } = await supabase
    .from("disponibilidad_unidades")
    .select("id, unidad")
    .in("id", unidadIds);

  if (unidadesError) {
    throw new Error(unidadesError.message);
  }

  const unidadById = new Map((unidades ?? []).map((row) => [row.id as string, row.unidad as string]));

  const operacionIds = ops.map((row) => row.id as string);
  const { data: documentos, error: documentosError } = await supabase
    .from("expediente_documentos")
    .select("operacion_id, checklist_codigo, tipo")
    .in("operacion_id", operacionIds)
    .eq("activo", true);

  if (documentosError) {
    if (documentosError.message.includes("expediente_documentos")) {
      throw new Error("Falta aplicar la migración 022_expediente_ventas.sql en Supabase.");
    }
    throw new Error(documentosError.message);
  }

  const codigosByOperacion = new Map<string, string[]>();
  for (const row of documentos ?? []) {
    const operacionId = row.operacion_id as string;
    const codigo =
      (row.checklist_codigo as string) || resolveChecklistCodigo(row.tipo as string);
    const list = codigosByOperacion.get(operacionId) ?? [];
    list.push(codigo);
    codigosByOperacion.set(operacionId, list);
  }

  return ops.map((row) => {
    const codigos = codigosByOperacion.get(row.id as string) ?? [];
    const progreso = computeChecklistProgreso(row.desarrollo_id as string, codigos, {
      personaMoral: Boolean(row.persona_moral),
    });
    return {
      operacionId: row.id as string,
      desarrolloId: row.desarrollo_id as string,
      clienteNombre: row.cliente_nombre as string,
      unidadNumero: unidadById.get(row.unidad_id as string) ?? "—",
      estatusSembrado: row.estatus_sembrado as string,
      escriturado: Boolean(row.escriturado),
      engancheCubierto: Boolean(row.enganche_cubierto),
      documentosSubidos: progreso.formalizacion.completados,
      documentosRequeridos: progreso.formalizacion.requeridos,
      progresoPct: progreso.formalizacion.pct,
      formalizacionPct: progreso.formalizacion.pct,
      updatedAt: row.updated_at as string,
    };
  });
};

export const getExpedienteDetail = async (
  operacionId: string,
  profile: AdminProfile,
): Promise<ExpedienteDetail | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data: operacion, error: operacionError } = await supabase
    .from("operaciones_comerciales")
    .select("*")
    .eq("id", operacionId)
    .maybeSingle();

  if (operacionError) {
    throw new Error(operacionError.message);
  }

  if (!operacion) {
    return null;
  }

  assertDesarrolloAccess(profile, operacion.desarrollo_id as string);

  const [{ data: unidad }, { data: documentos, error: documentosError }] = await Promise.all([
    supabase
      .from("disponibilidad_unidades")
      .select("unidad")
      .eq("id", operacion.unidad_id as string)
      .maybeSingle(),
    supabase
      .from("expediente_documentos")
      .select("*")
      .eq("operacion_id", operacionId)
      .eq("activo", true)
      .order("created_at", { ascending: false }),
  ]);

  if (documentosError) {
    if (documentosError.message.includes("expediente_documentos")) {
      throw new Error("Falta aplicar la migración 022_expediente_ventas.sql en Supabase.");
    }
    throw new Error(documentosError.message);
  }

  const docs = (documentos ?? []).map((row) => mapDocumento(row as Record<string, unknown>));
  const codigos = docs.map((doc) => doc.checklist_codigo);
  const progreso = computeChecklistProgreso(operacion.desarrollo_id as string, codigos, {
    personaMoral: Boolean(operacion.persona_moral),
  });

  return {
    operacion: operacion as OperacionComercialRecord,
    unidadNumero: (unidad?.unidad as string) ?? "—",
    documentos: docs,
    progreso,
    checklist: getExpedienteChecklist(operacion.desarrollo_id as string),
    driveFolderUrl: (operacion.drive_folder_id as string | null)
      ? getGoogleDriveOperacionFolderUrl(operacion.drive_folder_id as string)
      : null,
    driveConfigured: isGoogleDriveConfiguredForDesarrollo(operacion.desarrollo_id as string),
  };
};

const deactivatePreviousForCodigo = async (
  operacionId: string,
  codigo: string,
  confirmReplace: boolean,
) => {
  if (codigo === "OTRO" || codigo === "otro") {
    return;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: existing } = await supabase
    .from("expediente_documentos")
    .select("*")
    .eq("operacion_id", operacionId)
    .eq("checklist_codigo", codigo)
    .eq("activo", true)
    .maybeSingle();

  if (!existing) {
    return;
  }

  if (!confirmReplace) {
    const conflict = new Error("EXPEDIENTE_ALREADY_EXISTS") as Error & {
      code: "EXPEDIENTE_ALREADY_EXISTS";
      existing: ExpedienteDocumentoRecord;
    };
    conflict.code = "EXPEDIENTE_ALREADY_EXISTS";
    conflict.existing = mapDocumento(existing as Record<string, unknown>);
    throw conflict;
  }

  const { error } = await supabase
    .from("expediente_documentos")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (error) {
    throw new Error(error.message);
  }
};

export const uploadExpedienteDocumento = async (input: {
  operacionId: string;
  file: File;
  checklistCodigo: string;
  etapaChecklist?: ExpedienteChecklistEtapa;
  nombre: string;
  notas?: string;
  confirmReplace?: boolean;
  adminId: string;
  profile: AdminProfile;
}) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const detail = await getExpedienteDetail(input.operacionId, input.profile);
  if (!detail) {
    throw new Error("Operación no encontrada.");
  }

  const codigo = input.checklistCodigo.trim().toUpperCase();
  const mimeType = assertMime(input.file);
  await deactivatePreviousForCodigo(input.operacionId, codigo, input.confirmReplace ?? false);

  const safeName = input.file.name.replace(/[^\w.\-() ]+/g, "_");
  const storagePath = `${detail.operacion.desarrollo_id}/${input.operacionId}/${codigo}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  let driveFileId: string | null = null;
  let driveWebViewLink: string | null = null;
  let driveFolderId: string | null =
    (detail.operacion as { drive_folder_id?: string | null }).drive_folder_id ?? null;

  if (isGoogleDriveConfiguredForDesarrollo(detail.operacion.desarrollo_id)) {
    try {
      const driveResult = await uploadExpedienteToGoogleDrive({
        desarrolloId: detail.operacion.desarrollo_id,
        operacionId: input.operacionId,
        clienteNombre: detail.operacion.cliente_nombre,
        unidadNumero: detail.unidadNumero,
        checklistCodigo: codigo,
        fileName: safeName,
        mimeType,
        buffer,
        existingFolderId: driveFolderId,
      });
      driveFileId = driveResult.fileId;
      driveWebViewLink = driveResult.webViewLink;
      driveFolderId = driveResult.folderId;
    } catch (driveError) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      throw new Error(
        driveError instanceof Error
          ? `Google Drive: ${driveError.message}`
          : "No se pudo subir a Google Drive.",
      );
    }
  }

  const insertRow: Record<string, unknown> = {
    operacion_id: input.operacionId,
    desarrollo_id: detail.operacion.desarrollo_id,
    prospecto_id: detail.operacion.prospecto_id,
    tipo: codigo.toLowerCase(),
    checklist_codigo: codigo,
    etapa_checklist: input.etapaChecklist ?? null,
    nombre: input.nombre.trim(),
    nombre_archivo: safeName,
    storage_path: storagePath,
    mime_type: mimeType,
    tamano_bytes: input.file.size,
    subido_por: input.adminId,
    notas: input.notas?.trim() || null,
    activo: true,
  };

  if (driveFileId) {
    insertRow.drive_file_id = driveFileId;
    insertRow.drive_web_view_link = driveWebViewLink;
  }

  const { data, error } = await supabase.from("expediente_documentos").insert(insertRow).select("*").single();

  if (error && driveFileId && /drive_/.test(error.message)) {
    const fallbackRow = { ...insertRow };
    delete fallbackRow.drive_file_id;
    delete fallbackRow.drive_web_view_link;
    const retry = await supabase.from("expediente_documentos").insert(fallbackRow).select("*").single();
    if (retry.error) {
      throw new Error(
        `${retry.error.message} (Aplica también 026_google_drive_expediente.sql para guardar enlaces Drive.)`,
      );
    }
    return mapDocumento(retry.data as Record<string, unknown>);
  }

  if (error) {
    throw new Error(error.message);
  }

  if (driveFolderId && driveFolderId !== (detail.operacion as { drive_folder_id?: string | null }).drive_folder_id) {
    const { error: folderError } = await supabase
      .from("operaciones_comerciales")
      .update({
        drive_folder_id: driveFolderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.operacionId);

    if (folderError && !folderError.message.includes("drive_folder_id")) {
      throw new Error(folderError.message);
    }
  }

  return mapDocumento(data as Record<string, unknown>);
};

export const setPersonaMoralOperacion = async (
  operacionId: string,
  personaMoral: boolean,
  profile: AdminProfile,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const detail = await getExpedienteDetail(operacionId, profile);
  if (!detail) {
    throw new Error("Operación no encontrada.");
  }

  const { error } = await supabase
    .from("operaciones_comerciales")
    .update({
      persona_moral: personaMoral,
      updated_at: new Date().toISOString(),
    })
    .eq("id", operacionId);

  if (error) {
    if (error.message.includes("persona_moral")) {
      throw new Error("Falta aplicar la migración 023_expediente_comisiones.sql en Supabase.");
    }
    throw new Error(error.message);
  }
};

export const setEngancheCubierto = async (
  operacionId: string,
  cubierto: boolean,
  profile: AdminProfile,
  adminId: string,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const detail = await getExpedienteDetail(operacionId, profile);
  if (!detail) {
    throw new Error("Operación no encontrada.");
  }

  const { error } = await supabase
    .from("operaciones_comerciales")
    .update({
      enganche_cubierto: cubierto,
      enganche_cubierto_at: cubierto ? new Date().toISOString() : null,
      enganche_cubierto_por: cubierto ? adminId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", operacionId);

  if (error) {
    if (error.message.includes("enganche_cubierto")) {
      throw new Error("Falta aplicar la migración 023_expediente_comisiones.sql en Supabase.");
    }
    throw new Error(error.message);
  }
};

export const getExpedienteDocumentoSignedUrl = async (
  documentoId: string,
  profile: AdminProfile,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: documento, error } = await supabase
    .from("expediente_documentos")
    .select("*")
    .eq("id", documentoId)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!documento) {
    throw new Error("Documento no encontrado.");
  }

  if (!canAccessDesarrollo(profile, documento.desarrollo_id as string) && !isSuperAdmin(profile)) {
    throw new Error("No tienes permiso para este documento.");
  }

  const driveLink = documento.drive_web_view_link as string | null | undefined;
  if (driveLink) {
    return {
      url: driveLink,
      filename: documento.nombre_archivo as string,
      mimeType: documento.mime_type as string,
      source: "google_drive" as const,
    };
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(documento.storage_path as string, SIGNED_URL_TTL_SECONDS);

  if (signedError || !signed?.signedUrl) {
    throw new Error(signedError?.message ?? "No se pudo generar la URL del documento.");
  }

  return {
    url: signed.signedUrl,
    filename: documento.nombre_archivo as string,
    mimeType: documento.mime_type as string,
    source: "supabase" as const,
  };
};

export const deactivateExpedienteDocumento = async (
  documentoId: string,
  profile: AdminProfile,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: documento, error } = await supabase
    .from("expediente_documentos")
    .select("*")
    .eq("id", documentoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!documento) {
    throw new Error("Documento no encontrado.");
  }

  assertDesarrolloAccess(profile, documento.desarrollo_id as string);

  const { error: updateError } = await supabase
    .from("expediente_documentos")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("id", documentoId);

  if (updateError) {
    throw new Error(updateError.message);
  }
};
