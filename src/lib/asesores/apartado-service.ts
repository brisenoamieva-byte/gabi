import {
  getApartadoContextFromProspecto,
  getApartadoPrefill,
  mergeProspectoIntoPrefill,
  type ApartadoContextFromProspecto,
} from "@/lib/admin/operaciones-service";
import {
  assertAsesorDesarrollo,
  getProspectoForAsesor,
} from "@/lib/asesores/prospectos-service";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const assertProspectoPuedeApartar = (etapa: string) => {
  if (etapa === "vendido") {
    throw new Error("Este prospecto ya está vendido.");
  }
  if (etapa === "perdido") {
    throw new Error("No puedes apartar un prospecto marcado como descartado.");
  }
  if (etapa === "cancelado") {
    throw new Error(
      "Este prospecto está en Cancelado. Reactívalo a Cita antes de registrar un nuevo apartado.",
    );
  }
};

const assertSinOperacionActiva = async (prospectoId: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase
    .from("operaciones_comerciales")
    .select("id")
    .eq("prospecto_id", prospectoId)
    .eq("cancelada", false)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (data) {
    throw new Error("Este prospecto ya tiene un apartado registrado en sembrado.");
  }
};

export const getApartadoContextForAsesor = async (
  asesorId: string,
  prospectoId: string,
): Promise<ApartadoContextFromProspecto> => {
  const prospecto = await getProspectoForAsesor(asesorId, prospectoId);
  await assertAsesorDesarrollo(asesorId, prospecto.desarrollo_id);
  assertProspectoPuedeApartar(prospecto.etapa);
  await assertSinOperacionActiva(prospectoId);

  return getApartadoContextFromProspecto(prospectoId);
};

export const getApartadoPrefillForAsesor = async (
  asesorId: string,
  prospectoId: string,
  unidadId: string,
) => {
  const prospecto = await getProspectoForAsesor(asesorId, prospectoId);
  await assertAsesorDesarrollo(asesorId, prospecto.desarrollo_id);

  const prefill = await getApartadoPrefill(prospecto.desarrollo_id, unidadId);
  const cotizacion = prospecto.cotizaciones.find((item) => item.unidad_id === unidadId);

  return mergeProspectoIntoPrefill(
    prefill,
    prospecto,
    cotizacion?.id ?? prefill.cotizacionId,
  );
};

export const createApartadoForAsesor = async () => {
  throw new Error(
    "Solo gerencia puede registrar apartados. Usa «Solicitar apartado a gerencia» para notificar al gerente.",
  );
};
