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

export const getGuardiasHoyForAsesor = async (
  asesorId: string,
  desarrolloId: string,
): Promise<AsesorGuardiaHoy[]> => {
  await assertAsesorDesarrollo(asesorId, desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const today = formatDateYmd(new Date());

  const { data, error } = await supabase
    .from("guardia_asignaciones")
    .select("fecha, turno, notas")
    .eq("desarrollo_id", desarrolloId)
    .eq("asesor_id", asesorId)
    .eq("fecha", today)
    .eq("estado", "publicada")
    .order("turno", { ascending: true });

  if (error) {
    if (error.message.includes("guardia_asignaciones")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const turno = row.turno as GuardiaTurno;
    return {
      fecha: row.fecha as string,
      turno,
      turnoLabel: guardiaTurnoShortLabel[turno],
      turnoShortLabel: guardiaTurnoShortLabel[turno],
      horario: guardiaTurnoLabel[turno],
      notas: (row.notas as string | null) ?? null,
    };
  });
};

/** @deprecated Usa getGuardiasHoyForAsesor */
export const getGuardiaHoyForAsesor = async (
  asesorId: string,
  desarrolloId: string,
): Promise<AsesorGuardiaHoy | null> => {
  const guardias = await getGuardiasHoyForAsesor(asesorId, desarrolloId);
  return guardias[0] ?? null;
};
