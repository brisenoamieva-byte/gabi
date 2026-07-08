import { assertDesarrolloAccess } from "@/lib/admin/permissions";
import type {
  GuardiaMarcajeAdminRow,
  GuardiaMarcajesDiaPayload,
} from "@/lib/admin/guardia-marcajes-types";
import type { AdminProfile } from "@/lib/admin/types";
import { getCasetaConfig, hasGuardiaCasetaConfig } from "@/lib/asesores/guardias-service";
import { formatCasetaEtiquetaResumen } from "@/lib/comercial/guardia-caseta";
import type { GuardiaMarcajeTipo } from "@/lib/comercial/guardia-marcaje-types";
import {
  formatDateYmd,
  guardiaTurnoShortLabel,
  isGuardiaTurno,
  type GuardiaTurno,
} from "@/lib/comercial/guardias";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type { GuardiaMarcajeAdminRow, GuardiaMarcajesDiaPayload } from "@/lib/admin/guardia-marcajes-types";

function assertMarcajesTable(message: string) {
  if (message.includes("guardia_marcajes")) {
    throw new Error("Falta aplicar la migración 044_guardia_marcajes.sql en Supabase.");
  }
}

export async function listGuardiaMarcajesDia(
  desarrolloId: string,
  fecha: string,
  profile: AdminProfile,
  asesorNames: Record<string, string>,
): Promise<GuardiaMarcajesDiaPayload> {
  assertDesarrolloAccess(profile, desarrolloId);

  const marcajesEnabled = await hasGuardiaCasetaConfig(desarrolloId);
  if (!marcajesEnabled) {
    return {
      fecha,
      desarrolloId,
      marcajesEnabled: false,
      caseta: null,
      filas: [],
    };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const caseta = await getCasetaConfig(desarrolloId);

  const { data: asignaciones, error: asignacionesError } = await supabase
    .from("guardia_asignaciones")
    .select("id, asesor_id, fecha, turno, estado")
    .eq("desarrollo_id", desarrolloId)
    .eq("fecha", fecha)
    .order("turno", { ascending: true });

  if (asignacionesError) {
    throw new Error(asignacionesError.message);
  }

  const asignacionIds = (asignaciones ?? []).map((row) => row.id as string);
  let marcajes: Array<{
    asignacion_id: string;
    tipo: string;
    registrado_at: string;
    distancia_metros: number;
  }> = [];

  if (asignacionIds.length) {
    const { data, error } = await supabase
      .from("guardia_marcajes")
      .select("asignacion_id, tipo, registrado_at, distancia_metros")
      .in("asignacion_id", asignacionIds);

    if (error) {
      assertMarcajesTable(error.message);
      throw new Error(error.message);
    }
    marcajes = (data ?? []) as typeof marcajes;
  }

  const marcajesByAsignacion = new Map<string, typeof marcajes>();
  for (const item of marcajes) {
    const list = marcajesByAsignacion.get(item.asignacion_id) ?? [];
    list.push(item);
    marcajesByAsignacion.set(item.asignacion_id, list);
  }

  const filas: GuardiaMarcajeAdminRow[] = (asignaciones ?? []).map((row) => {
    const turno = row.turno as GuardiaTurno;
    const asignacionId = row.id as string;
    const asesorId = row.asesor_id as string;
    const estadoAsignacion = row.estado as string;
    const items = marcajesByAsignacion.get(asignacionId) ?? [];
    const entradaRaw = items.find((item) => item.tipo === "entrada");
    const salidaRaw = items.find((item) => item.tipo === "salida");

    const entrada = entradaRaw
      ? {
          registradoAt: entradaRaw.registrado_at,
          distanciaMetros: entradaRaw.distancia_metros,
        }
      : null;
    const salida = salidaRaw
      ? {
          registradoAt: salidaRaw.registrado_at,
          distanciaMetros: salidaRaw.distancia_metros,
        }
      : null;

    let cumplimiento: GuardiaMarcajeAdminRow["cumplimiento"] = "sin_publicar";
    if (estadoAsignacion === "publicada") {
      if (entrada && salida) {
        cumplimiento = "completo";
      } else if (!entrada) {
        cumplimiento = "pendiente_entrada";
      } else {
        cumplimiento = "pendiente_salida";
      }
    }

    return {
      asignacionId,
      asesorId,
      asesorNombre: asesorNames[asesorId] ?? null,
      fecha: row.fecha as string,
      turno,
      turnoLabel: guardiaTurnoShortLabel[turno],
      estadoAsignacion,
      entrada,
      salida,
      cumplimiento,
    };
  });

  return {
    fecha,
    desarrolloId,
    marcajesEnabled: true,
    caseta: {
      etiqueta: formatCasetaEtiquetaResumen(caseta),
      radioMetros: caseta.radioMetros,
      lat: caseta.lat,
      lng: caseta.lng,
    },
    filas,
  };
}

export function todayYmd(): string {
  return formatDateYmd(new Date());
}

export function isMarcajeTipo(value: string): value is GuardiaMarcajeTipo {
  return value === "entrada" || value === "salida";
}

export function parseGuardiaTurno(value: string): GuardiaTurno | null {
  return isGuardiaTurno(value) ? value : null;
}
