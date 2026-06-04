import {
  createProspecto,
  findProspectoByContact,
  getProspectoById,
  getProspectosResumen,
  listProspectos,
  upsertProspectoFromVisita,
  type ProspectoDetail,
  type ProspectosResumen,
  type ProspectoListRow,
} from "@/lib/admin/prospectos-service";
import { isProspectoEtapa } from "@/lib/comercial/prospecto-etapas";
import { ETAPAS_ASESOR } from "@/lib/asesores/prospectos-client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { validateAsesorForVisita } from "@/lib/visitas/service";

export const assertAsesorDesarrollo = async (asesorId: string, desarrolloId: string) => {
  const validation = await validateAsesorForVisita(asesorId, desarrolloId);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }
};

const assertProspectoOwnership = (
  prospecto: ProspectoDetail,
  asesorId: string,
  desarrolloId: string,
) => {
  if (prospecto.desarrollo_id !== desarrolloId) {
    throw new Error("Prospecto fuera de tu desarrollo.");
  }
  if (prospecto.asesor_id !== asesorId) {
    throw new Error("Este prospecto no está asignado a ti.");
  }
};

export const listProspectosForAsesor = async (
  asesorId: string,
  filters: {
    desarrolloId: string;
    etapa?: string;
    search?: string;
    desde?: string;
    hasta?: string;
  },
): Promise<ProspectoListRow[]> => {
  await assertAsesorDesarrollo(asesorId, filters.desarrolloId);
  return listProspectos({ ...filters, asesorId, fechaEn: "updated" });
};

export const getProspectosResumenForAsesor = async (
  asesorId: string,
  desarrolloId: string,
  filters?: { search?: string; desde?: string; hasta?: string },
): Promise<ProspectosResumen> => {
  await assertAsesorDesarrollo(asesorId, desarrolloId);
  return getProspectosResumen(desarrolloId, undefined, {
    asesorId,
    ...filters,
    fechaEn: "updated",
  });
};

export const getProspectoForAsesor = async (
  asesorId: string,
  prospectoId: string,
): Promise<ProspectoDetail> => {
  const prospecto = await getProspectoById(prospectoId);
  if (!prospecto) {
    throw new Error("Prospecto no encontrado.");
  }

  assertProspectoOwnership(prospecto, asesorId, prospecto.desarrollo_id);
  return prospecto;
};

export type AsesorCreateProspectoInput = {
  desarrolloId: string;
  nombre: string;
  email?: string;
  telefono?: string;
  medioContacto?: string;
  notas?: string;
};

export type AsesorUpdateProspectoInput = {
  etapa?: string;
  notas?: string;
};

export const createProspectoForAsesor = async (
  asesorId: string,
  input: AsesorCreateProspectoInput,
): Promise<ProspectoDetail> => {
  await assertAsesorDesarrollo(asesorId, input.desarrolloId);

  const nombre = input.nombre.trim();
  if (!nombre) {
    throw new Error("Nombre requerido.");
  }

  const email = input.email?.trim();
  const telefono = input.telefono?.trim();

  if (email || telefono) {
    const existing = await findProspectoByContact(input.desarrolloId, email, telefono);
    if (existing?.asesor_id && existing.asesor_id !== asesorId) {
      throw new Error("Ya existe un prospecto con ese contacto asignado a otro asesor.");
    }
  }

  const prospectoInput = {
    desarrolloId: input.desarrolloId,
    nombre,
    email,
    telefono,
    medioContacto: input.medioContacto?.trim(),
    asesorId,
    etapa: "nuevo" as const,
    notas: input.notas?.trim(),
  };

  const record =
    email || telefono
      ? await upsertProspectoFromVisita(prospectoInput)
      : await createProspecto(prospectoInput);

  return getProspectoForAsesor(asesorId, record.id);
};

export const updateProspectoForAsesor = async (
  asesorId: string,
  prospectoId: string,
  input: AsesorUpdateProspectoInput,
): Promise<ProspectoDetail> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const existing = await getProspectoForAsesor(asesorId, prospectoId);
  const etapaBloqueada = existing.etapa === "apartado" || existing.etapa === "vendido";

  if (input.etapa !== undefined) {
    if (etapaBloqueada) {
      throw new Error("Este cliente ya está en apartado o vendido. Solo puedes actualizar notas.");
    }
    if (!isProspectoEtapa(input.etapa) || !ETAPAS_ASESOR.includes(input.etapa)) {
      throw new Error("Etapa no permitida para asesor.");
    }
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.etapa !== undefined) {
    patch.etapa = input.etapa;
  }
  if (input.notas !== undefined) {
    patch.notas = input.notas.trim() || null;
  }

  const { error } = await supabase.from("prospectos").update(patch).eq("id", prospectoId);
  if (error) {
    throw new Error(error.message);
  }

  return getProspectoForAsesor(asesorId, prospectoId);
};

export { ETAPAS_ASESOR, prospectoEtapaEditableByAsesor } from "@/lib/asesores/prospectos-client";
