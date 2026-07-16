import { assertDesarrolloAccess, canAccessDesarrollo, isSuperAdmin } from "@/lib/admin/permissions";
import { resolveAdminUserIdForDb } from "@/lib/admin/admin-user-id";
import type { AdminProfile } from "@/lib/admin/types";
import {
  computeChecklistProgreso,
  getExpedienteChecklist,
  resolveChecklistCodigo,
  type ExpedienteChecklistEtapa,
} from "@/lib/comercial/expediente-checklist";
import {
  buildExpedienteDocContext,
  expedienteDocxMime,
  mergeKycPrefill,
  renderExpedienteDocxFromBuffer,
} from "@/lib/comercial/expediente-doc-generator";
import {
  canGenerateApartadoPack,
  getApartadoTemplateDefs,
  getExpedienteTemplateBaseDir,
} from "@/lib/comercial/expediente-template-map";
import {
  normalizeClienteKyc,
  normalizePlanPago,
  type ClienteKycDatos,
  type PlanPagoDatos,
} from "@/lib/comercial/expediente-oferta-types";
import { loadExpedienteTemplateBuffer } from "@/lib/admin/expediente-templates-service";
import type {
  CotizacionRecord,
  OperacionComercialRecord,
  ProspectoRecord,
} from "@/lib/comercial/sembrado-status";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { desarrollos, getDatosBancarios } from "@/lib/data";
import { normalizeCampoConfig } from "@/lib/catalog/campo-config";
import {
  getGoogleDriveOperacionFolderUrl,
  isGoogleDriveConfiguredForDesarrolloAsync,
  assertGoogleDriveRequiredForDesarrolloAsync,
} from "@/lib/integrations/google-drive-config";
import {
  ensureOperacionDriveFolder,
  uploadExpedienteToGoogleDrive,
} from "@/lib/integrations/google-drive-service";

const BUCKET = "gabi-expedientes";
const SIGNED_URL_TTL_SECONDS = 60 * 15;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
  unidadTipo: string | null;
  unidadPrototipoId: string | null;
  prospecto: ProspectoRecord | null;
  kyc: ClienteKycDatos;
  planPago: PlanPagoDatos;
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
      : file.name.toLowerCase().endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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

  const [{ data: unidad }, { data: documentos, error: documentosError }, prospectoResult] =
    await Promise.all([
      supabase
        .from("disponibilidad_unidades")
        .select("unidad, tipo, prototipo_id")
        .eq("id", operacion.unidad_id as string)
        .maybeSingle(),
      supabase
        .from("expediente_documentos")
        .select("*")
        .eq("operacion_id", operacionId)
        .eq("activo", true)
        .order("created_at", { ascending: false }),
      operacion.prospecto_id
        ? supabase
            .from("prospectos")
            .select("*")
            .eq("id", operacion.prospecto_id as string)
            .maybeSingle()
        : Promise.resolve({ data: null }),
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

  const prospecto = (prospectoResult.data as ProspectoRecord | null) ?? null;
  const op = operacion as OperacionComercialRecord;
  const ensuredFolder = await ensureExpedienteDriveFolderForOperacionRecord(op, {
    unidadNumero: (unidad?.unidad as string) ?? "—",
  });
  const kyc = mergeKycPrefill(op.cliente_kyc, prospecto);
  const planPago = normalizePlanPago(op.plan_pago);

  return {
    operacion: op,
    unidadNumero: (unidad?.unidad as string) ?? "—",
    unidadTipo: (unidad?.tipo as string | null) ?? null,
    unidadPrototipoId: (unidad?.prototipo_id as string | null) ?? null,
    prospecto,
    kyc,
    planPago,
    documentos: docs,
    progreso,
    checklist: getExpedienteChecklist(operacion.desarrollo_id as string),
    driveFolderUrl:
      ensuredFolder?.folderUrl ??
      ((operacion.drive_folder_id as string | null)
        ? getGoogleDriveOperacionFolderUrl(operacion.drive_folder_id as string)
        : null),
    driveConfigured: await isGoogleDriveConfiguredForDesarrolloAsync(
      operacion.desarrollo_id as string,
    ),
  };
};

const ensureExpedienteDriveFolderForOperacionRecord = async (
  operacion: OperacionComercialRecord,
  options?: { unidadNumero?: string | null },
): Promise<{ folderId: string; folderUrl: string } | null> => {
  if (!(await isGoogleDriveConfiguredForDesarrolloAsync(operacion.desarrollo_id))) {
    return null;
  }

  const unidadNumero =
    options?.unidadNumero ??
    (() => {
      throw new Error("Falta unidad para crear carpeta Drive del expediente.");
    })();

  const existingFolderId = (operacion as { drive_folder_id?: string | null }).drive_folder_id ?? null;
  const ensured = await ensureOperacionDriveFolder({
    desarrolloId: operacion.desarrollo_id,
    operacionId: operacion.id,
    clienteNombre: operacion.cliente_nombre,
    unidadNumero,
    existingFolderId,
  });

  if (ensured.folderId && ensured.folderId !== existingFolderId) {
    const supabase = createSupabaseServiceClient();
    if (!supabase) {
      throw new Error("Supabase no configurado.");
    }
    const { error } = await supabase
      .from("operaciones_comerciales")
      .update({
        drive_folder_id: ensured.folderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", operacion.id);
    if (error && !error.message.includes("drive_folder_id")) {
      throw new Error(error.message);
    }
  }

  return ensured;
};

export const ensureExpedienteDriveFolderForOperacion = async (
  operacionId: string,
): Promise<{ folderId: string; folderUrl: string } | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: operacion, error: operacionError } = await supabase
    .from("operaciones_comerciales")
    .select("id, desarrollo_id, cliente_nombre, unidad_id, drive_folder_id")
    .eq("id", operacionId)
    .maybeSingle();

  if (operacionError) {
    throw new Error(operacionError.message);
  }
  if (!operacion) {
    return null;
  }

  const { data: unidad, error: unidadError } = await supabase
    .from("disponibilidad_unidades")
    .select("unidad")
    .eq("id", operacion.unidad_id as string)
    .maybeSingle();
  if (unidadError) {
    throw new Error(unidadError.message);
  }

  const unidadNumero = (unidad?.unidad as string | null) ?? "—";

  return ensureExpedienteDriveFolderForOperacionRecord(
    operacion as OperacionComercialRecord,
    { unidadNumero },
  );
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
  adminId?: string | null;
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

  await assertGoogleDriveRequiredForDesarrolloAsync(detail.operacion.desarrollo_id);

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

  if (await isGoogleDriveConfiguredForDesarrolloAsync(detail.operacion.desarrollo_id)) {
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
    subido_por: resolveAdminUserIdForDb(input.adminId),
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
      // Operador master usa id sintético "operador-gabi"; la columna es uuid nullable.
      enganche_cubierto_por: cubierto ? resolveAdminUserIdForDb(adminId) : null,
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

export const updateExpedienteOfertaDatos = async (
  operacionId: string,
  input: { clienteKyc?: ClienteKycDatos; planPago?: PlanPagoDatos },
  profile: AdminProfile,
): Promise<ExpedienteDetail> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const detail = await getExpedienteDetail(operacionId, profile);
  if (!detail) {
    throw new Error("Operación no encontrada.");
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.clienteKyc !== undefined) {
    patch.cliente_kyc = normalizeClienteKyc(input.clienteKyc);
  }
  if (input.planPago !== undefined) {
    patch.plan_pago = normalizePlanPago(input.planPago);
  }

  const { error } = await supabase
    .from("operaciones_comerciales")
    .update(patch)
    .eq("id", operacionId);

  if (error) {
    if (error.message.includes("cliente_kyc") || error.message.includes("plan_pago")) {
      throw new Error("Falta aplicar la migración 068_expediente_oferta_datos.sql en Supabase.");
    }
    throw new Error(error.message);
  }

  const updated = await getExpedienteDetail(operacionId, profile);
  if (!updated) {
    throw new Error("Operación no encontrada tras guardar.");
  }
  return updated;
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

export type GenerateApartadoPackResult = {
  generated: ExpedienteDocumentoRecord[];
  skipped: { codigo: string; reason: string }[];
  missingTemplates: string[];
};

export const generateApartadoPack = async (
  operacionId: string,
  profile: AdminProfile,
  adminId: string,
  options?: { confirmReplace?: boolean },
): Promise<GenerateApartadoPackResult> => {
  const detail = await getExpedienteDetail(operacionId, profile);
  if (!detail) {
    throw new Error("Operación no encontrada.");
  }

  const desarrolloId = detail.operacion.desarrollo_id;
  if (!canGenerateApartadoPack(desarrolloId)) {
    throw new Error("Generación automática no disponible para este desarrollo.");
  }

  const baseDir = getExpedienteTemplateBaseDir(desarrolloId);
  if (!baseDir) {
    throw new Error("Plantillas no configuradas para este desarrollo.");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  let cotizacion: CotizacionRecord | null = null;
  if (detail.operacion.cotizacion_id) {
    const { data } = await supabase
      .from("cotizaciones")
      .select("*")
      .eq("id", detail.operacion.cotizacion_id)
      .maybeSingle();
    cotizacion = (data as CotizacionRecord | null) ?? null;
  }

  const { data: desarrolloRow } = await supabase
    .from("desarrollos_catalog")
    .select("campo_config")
    .eq("id", desarrolloId)
    .maybeSingle();
  const campoConfig = normalizeCampoConfig(desarrolloRow?.campo_config);
  const datosBancarios = getDatosBancarios(desarrolloId, campoConfig);
  const desarrolloNombre = desarrollos.find((d) => d.id === desarrolloId)?.nombre ?? desarrolloId;

  const operacionWithKyc: OperacionComercialRecord = {
    ...detail.operacion,
    cliente_kyc: detail.kyc,
    plan_pago: detail.planPago,
  };

  const context = buildExpedienteDocContext({
    operacion: operacionWithKyc,
    unidad: {
      unidadNumero: detail.unidadNumero,
      tipo: detail.unidadTipo,
      prototipoId: detail.unidadPrototipoId,
    },
    desarrolloNombre,
    prospecto: detail.prospecto,
    cotizacion,
    datosBancarios,
    cuotaMantenimiento: campoConfig.cuotaMantenimiento ?? null,
    apartadoDefault: campoConfig.cotizador?.apartado ?? null,
  });

  const generated: ExpedienteDocumentoRecord[] = [];
  const skipped: { codigo: string; reason: string }[] = [];
  const missingTemplates: string[] = [];

  const safeCliente = detail.operacion.cliente_nombre.replace(/[^\w.\-() ]+/g, "_").slice(0, 40);

  for (const tpl of getApartadoTemplateDefs(desarrolloId)) {
    const loaded = await loadExpedienteTemplateBuffer(desarrolloId, tpl.fileName);
    if (!loaded) {
      missingTemplates.push(tpl.fileName);
      continue;
    }

    try {
      const buffer = renderExpedienteDocxFromBuffer(loaded.buffer, context);
      const fileName = `${tpl.codigo}-${safeCliente}.docx`;
      const file = new File([new Uint8Array(buffer)], fileName, { type: expedienteDocxMime });

      const documento = await uploadExpedienteDocumento({
        operacionId,
        file,
        checklistCodigo: tpl.codigo,
        etapaChecklist: "apartado",
        nombre: tpl.titulo,
        confirmReplace: options?.confirmReplace ?? false,
        adminId,
        profile,
      });
      generated.push(documento);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EXPEDIENTE_ALREADY_EXISTS"
      ) {
        skipped.push({ codigo: tpl.codigo, reason: "ya_existe" });
        continue;
      }
      skipped.push({
        codigo: tpl.codigo,
        reason: error instanceof Error ? error.message : "Error al generar",
      });
    }
  }

  return { generated, skipped, missingTemplates };
};
