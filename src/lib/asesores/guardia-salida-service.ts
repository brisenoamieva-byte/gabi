import {
  createProspecto,
  findProspectoByTelefonoInDesarrollo,
} from "@/lib/admin/prospectos-service";
import { registerGuardiaMarcaje } from "@/lib/asesores/guardias-service";
import { bootstrapCadenciaForProspecto } from "@/lib/comercial/cadencia-service";
import { recomputeLeadActivityScoreSafe } from "@/lib/comercial/lead-activity-score-service";
import {
  buildGuardiaSalidaProspectoNotas,
  computeGuardiaSalidaCalificacion,
  guardiaSalidaMedioContactoToProspecto,
  guardiaSalidaProspectoToPerfilAnswers,
  validateGuardiaSalidaCuestionarioInput,
  type GuardiaSalidaCuestionarioInput,
  type GuardiaSalidaProspectoInput,
} from "@/lib/comercial/guardia-salida-cuestionario";
import type { GuardiaMarcajeResumen } from "@/lib/comercial/guardia-marcaje-types";
import { perfilamientoVisitaToRow } from "@/lib/comercial/perfilamiento-post-visita";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function assertSalidaTables(message: string) {
  if (
    message.includes("guardia_salida_cuestionarios") ||
    message.includes("guardia_salida_prospectos")
  ) {
    throw new Error("Falta aplicar la migración 058_guardia_salida_cuestionario.sql en Supabase.");
  }
}

const upsertProspectoFromGuardiaSalida = async (
  asesorId: string,
  desarrolloId: string,
  entry: GuardiaSalidaProspectoInput,
): Promise<string> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { medioContacto, medioPublicitario } = guardiaSalidaMedioContactoToProspecto(
    entry.medioContacto,
  );
  const perfilAnswers = guardiaSalidaProspectoToPerfilAnswers(entry);
  const perfilCalificacionLead = computeGuardiaSalidaCalificacion(entry);
  const notas = buildGuardiaSalidaProspectoNotas(entry);

  const patch = {
    nombre: entry.nombre,
    email: entry.email,
    telefono: entry.telefono,
    medio_contacto: medioContacto,
    medio_publicitario: entry.esCrossSelling ? "Crosseling" : medioPublicitario || medioContacto,
    asesor_id: asesorId,
    visita_realizada_on: entry.fechaAtencion,
    ...perfilamientoVisitaToRow(perfilAnswers),
    perfil_calificacion_lead: perfilCalificacionLead,
    notas,
    updated_at: new Date().toISOString(),
  };

  const duplicate = await findProspectoByTelefonoInDesarrollo(desarrolloId, entry.telefono);
  if (duplicate) {
    const { data, error } = await supabase
      .from("prospectos")
      .update(patch)
      .eq("id", duplicate.prospecto.id)
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await recomputeLeadActivityScoreSafe(data.id as string);
    return data.id as string;
  }

  const record = await createProspecto({
    desarrolloId,
    nombre: entry.nombre,
    email: entry.email,
    telefono: entry.telefono,
    medioContacto,
    medioPublicitario: patch.medio_publicitario,
    asesorId,
    etapa: "nuevo",
    notas,
  });

  const { error: perfilError } = await supabase
    .from("prospectos")
    .update({
      visita_realizada_on: entry.fechaAtencion,
      ...perfilamientoVisitaToRow(perfilAnswers),
      perfil_calificacion_lead: perfilCalificacionLead,
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  if (perfilError) {
    throw new Error(perfilError.message);
  }

  await recomputeLeadActivityScoreSafe(record.id);

  try {
    await bootstrapCadenciaForProspecto(record.id);
  } catch {
    // no bloquear registro de guardia
  }

  return record.id;
};

export const registerGuardiaSalida = async (input: {
  asesorId: string;
  desarrolloId: string;
  turno: string;
  lat: number;
  lng: number;
  accuracyMetros?: number | null;
  cuestionario: unknown;
}): Promise<{ marcaje: GuardiaMarcajeResumen & { id: string }; atendioCitasVisitas: boolean }> => {
  const cuestionario = validateGuardiaSalidaCuestionarioInput(input.cuestionario);

  const marcaje = await registerGuardiaMarcaje({
    asesorId: input.asesorId,
    desarrolloId: input.desarrolloId,
    turno: input.turno,
    tipo: "salida",
    lat: input.lat,
    lng: input.lng,
    accuracyMetros: input.accuracyMetros,
  });

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: cuestionarioRow, error: cuestionarioError } = await supabase
    .from("guardia_salida_cuestionarios")
    .insert({
      asignacion_id: marcaje.asignacionId,
      marcaje_id: marcaje.id,
      asesor_id: input.asesorId,
      desarrollo_id: input.desarrolloId,
      fecha: marcaje.fecha,
      turno: input.turno,
      atendio_citas_visitas: cuestionario.atendioCitasVisitas,
    })
    .select("id")
    .single();

  if (cuestionarioError) {
    assertSalidaTables(cuestionarioError.message);
    throw new Error(cuestionarioError.message);
  }

  if (cuestionario.atendioCitasVisitas && cuestionario.prospectos?.length) {
    for (let index = 0; index < cuestionario.prospectos.length; index += 1) {
      const entry = cuestionario.prospectos[index]!;
      const prospectoId = await upsertProspectoFromGuardiaSalida(
        input.asesorId,
        input.desarrolloId,
        entry,
      );

      const { error: prospectoError } = await supabase.from("guardia_salida_prospectos").insert({
        cuestionario_id: cuestionarioRow.id,
        orden: index + 1,
        tipo_prospecto: entry.tipoProspecto,
        nombre: entry.nombre,
        telefono: entry.telefono,
        email: entry.email,
        medio_contacto: entry.medioContacto,
        es_cross_selling: entry.esCrossSelling,
        perfil_presupuesto_disponible: entry.presupuestoDisponible,
        perfil_intencion_apartar: entry.intencionApartarInmediato,
        perfil_decisor_visita: entry.decisorVisita,
        comentarios_generales: entry.comentariosGenerales,
        perfil_vio_publicidad_redes: entry.vioPublicidadRedes,
        fecha_atencion: entry.fechaAtencion,
        perfil_calificacion_lead: computeGuardiaSalidaCalificacion(entry),
        prospecto_id: prospectoId,
      });

      if (prospectoError) {
        assertSalidaTables(prospectoError.message);
        throw new Error(prospectoError.message);
      }
    }
  }

  return {
    marcaje,
    atendioCitasVisitas: cuestionario.atendioCitasVisitas,
  };
};

export type { GuardiaSalidaCuestionarioInput };
