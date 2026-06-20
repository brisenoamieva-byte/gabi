import { uploadExpedienteDocumento } from "@/lib/admin/expediente-service";
import type { AdminProfile } from "@/lib/admin/types";
import {
  assertAsesorDesarrollo,
  getProspectoForAsesor,
} from "@/lib/asesores/prospectos-service";
import { getChecklistItem, getExpedienteChecklist } from "@/lib/comercial/expediente-checklist";
import { isGoogleDriveConfiguredForDesarrollo } from "@/lib/integrations/google-drive-config";
import { getGoogleDriveOperacionFolderUrl } from "@/lib/integrations/google-drive-config";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type AsesorExpedienteSummary = {
  operacionId: string;
  clienteNombre: string;
  unidadNumero: string;
  driveFolderUrl: string | null;
  driveConfigured: boolean;
  progresoApartadoCliente: {
    completados: number;
    requeridos: number;
    pct: number;
  };
  items: Array<{
    codigo: string;
    titulo: string;
    requerido: boolean;
    subido: boolean;
    documentoId?: string;
    driveLink?: string | null;
  }>;
};

const buildSyntheticProfile = (desarrolloId: string, asesorId: string): AdminProfile => ({
  id: asesorId,
  nombre: "Asesor",
  email: "",
  rol: "gerente",
  activo: true,
  desarrollosIds: [desarrolloId],
});

export const getExpedienteSummaryForProspecto = async (
  asesorId: string,
  prospectoId: string,
): Promise<AsesorExpedienteSummary | null> => {
  const prospecto = await getProspectoForAsesor(asesorId, prospectoId);
  await assertAsesorDesarrollo(asesorId, prospecto.desarrollo_id);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: operacion, error: opError } = await supabase
    .from("operaciones_comerciales")
    .select("id, cliente_nombre, unidad_id, desarrollo_id, drive_folder_id, persona_moral, cancelada")
    .eq("prospecto_id", prospectoId)
    .eq("cancelada", false)
    .maybeSingle();

  if (opError) {
    throw new Error(opError.message);
  }
  if (!operacion) {
    return null;
  }

  const desarrolloId = operacion.desarrollo_id as string;

  const [{ data: unidad }, { data: documentos }] = await Promise.all([
    supabase
      .from("disponibilidad_unidades")
      .select("unidad")
      .eq("id", operacion.unidad_id as string)
      .maybeSingle(),
    supabase
      .from("expediente_documentos")
      .select("id, checklist_codigo, drive_web_view_link")
      .eq("operacion_id", operacion.id as string)
      .eq("activo", true),
  ]);

  const docsByCodigo = new Map(
    (documentos ?? []).map((row) => [
      (row.checklist_codigo as string).toUpperCase(),
      row as { id: string; drive_web_view_link: string | null },
    ]),
  );

  const checklist = getExpedienteChecklist(desarrolloId);
  const clienteApartado = checklist.filter(
    (item) => item.etapa === "apartado" && item.parte === "cliente",
  );

  const personaMoral = Boolean(operacion.persona_moral);
  const items = clienteApartado
    .filter((item) => !item.soloPersonaMoral || personaMoral)
    .map((item) => {
      const doc = docsByCodigo.get(item.codigo);
      return {
        codigo: item.codigo,
        titulo: item.titulo,
        requerido: item.requeridoApartado,
        subido: Boolean(doc),
        documentoId: doc?.id,
        driveLink: doc?.drive_web_view_link ?? null,
      };
    });

  const requeridos = items.filter((item) => item.requerido);
  const completados = requeridos.filter((item) => item.subido).length;

  return {
    operacionId: operacion.id as string,
    clienteNombre: (operacion.cliente_nombre as string) ?? prospecto.nombre,
    unidadNumero: (unidad?.unidad as string) ?? "—",
    driveFolderUrl: operacion.drive_folder_id
      ? getGoogleDriveOperacionFolderUrl(operacion.drive_folder_id as string)
      : null,
    driveConfigured: isGoogleDriveConfiguredForDesarrollo(desarrolloId),
    progresoApartadoCliente: {
      completados,
      requeridos: requeridos.length,
      pct: requeridos.length ? Math.round((completados / requeridos.length) * 100) : 0,
    },
    items,
  };
};

export const uploadExpedienteDocumentoAsesor = async (input: {
  asesorId: string;
  prospectoId: string;
  checklistCodigo: string;
  file: File;
  nombre: string;
  confirmReplace?: boolean;
}) => {
  const prospecto = await getProspectoForAsesor(input.asesorId, input.prospectoId);
  await assertAsesorDesarrollo(input.asesorId, prospecto.desarrollo_id);

  const summary = await getExpedienteSummaryForProspecto(input.asesorId, input.prospectoId);
  if (!summary) {
    throw new Error(
      "Aún no hay operación de apartado. El gerente debe confirmar el apartado en sembrado.",
    );
  }

  const codigo = input.checklistCodigo.trim().toUpperCase();
  const item = getChecklistItem(prospecto.desarrollo_id, codigo);
  if (!item || item.etapa !== "apartado" || item.parte !== "cliente") {
    throw new Error("Solo puedes subir documentación del cliente para la fase de apartado.");
  }

  const profile = buildSyntheticProfile(prospecto.desarrollo_id, input.asesorId);

  return uploadExpedienteDocumento({
    operacionId: summary.operacionId,
    file: input.file,
    checklistCodigo: codigo,
    etapaChecklist: "apartado",
    nombre: input.nombre.trim() || item.titulo,
    notas: `Asesor: ${input.asesorId}`,
    confirmReplace: input.confirmReplace,
    adminId: null,
    profile,
  });
};
