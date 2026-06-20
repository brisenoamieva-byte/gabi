import { assertAsesorDesarrollo } from "@/lib/asesores/prospectos-service";
import {
  formatDateYmd,
  guardiaTurnoLabel,
  guardiaTurnoShortLabel,
  type GuardiaTurno,
} from "@/lib/comercial/guardias";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type AsesorGuardiaHoy = {
  fecha: string;
  turno: GuardiaTurno;
  turnoLabel: string;
  turnoShortLabel: string;
  horario: string;
  notas: string | null;
};

export const getGuardiaHoyForAsesor = async (
  asesorId: string,
  desarrolloId: string,
): Promise<AsesorGuardiaHoy | null> => {
  await assertAsesorDesarrollo(asesorId, desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const today = formatDateYmd(new Date());

  const { data, error } = await supabase
    .from("guardia_asignaciones")
    .select("fecha, turno, notas")
    .eq("desarrollo_id", desarrolloId)
    .eq("asesor_id", asesorId)
    .eq("fecha", today)
    .eq("estado", "publicada")
    .maybeSingle();

  if (error) {
    if (error.message.includes("guardia_asignaciones")) {
      return null;
    }
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const turno = data.turno as GuardiaTurno;

  return {
    fecha: data.fecha as string,
    turno,
    turnoLabel: guardiaTurnoShortLabel[turno],
    turnoShortLabel: guardiaTurnoShortLabel[turno],
    horario: guardiaTurnoLabel[turno],
    notas: (data.notas as string | null) ?? null,
  };
};
