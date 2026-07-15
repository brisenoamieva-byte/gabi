import { assertDesarrolloAccess } from "@/lib/admin/permissions";
import type {
  GuardiaMarcajeAdminRow,
  GuardiaMarcajesDiaPayload,
} from "@/lib/admin/guardia-marcajes-types";
import type { AdminProfile } from "@/lib/admin/types";
import { getCasetaConfig, hasGuardiaCasetaConfig } from "@/lib/asesores/guardias-service";
import { formatCasetaEtiquetaResumen } from "@/lib/comercial/guardia-caseta";
import { isGuardiaCorridaCompleta } from "@/lib/comercial/guardia-corrida";
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

  let marcajes: Array<{
    asignacion_id: string;
    asesor_id: string;
    turno: string;
    tipo: string;
    registrado_at: string;
    distancia_metros: number;
  }> = [];

  {
    const { data, error } = await supabase
      .from("guardia_marcajes")
      .select("asignacion_id, asesor_id, turno, tipo, registrado_at, distancia_metros")
      .eq("desarrollo_id", desarrolloId)
      .eq("fecha", fecha);

    if (error) {
      assertMarcajesTable(error.message);
      throw new Error(error.message);
    }
    marcajes = (data ?? []) as typeof marcajes;
  }

  const marcajesByAsignacion = new Map<string, typeof marcajes>();
  const marcajesByAsesor = new Map<string, Array<{ turno: string; tipo: string }>>();
  for (const item of marcajes) {
    const list = marcajesByAsignacion.get(item.asignacion_id) ?? [];
    list.push(item);
    marcajesByAsignacion.set(item.asignacion_id, list);

    const refs = marcajesByAsesor.get(item.asesor_id) ?? [];
    refs.push({ turno: item.turno, tipo: item.tipo });
    marcajesByAsesor.set(item.asesor_id, refs);
  }

  const filas: GuardiaMarcajeAdminRow[] = (asignaciones ?? []).map((row) => {
    const turno = row.turno as GuardiaTurno;
    const asignacionId = row.id as string;
    const asesorId = row.asesor_id as string;
    const estadoAsignacion = row.estado as string;
    const items = marcajesByAsignacion.get(asignacionId) ?? [];
    // Preferir el marcaje del asignado; si no hay, el de quien cubrió.
    const pickTipo = (tipo: string) => {
      const propios = items.filter((item) => item.tipo === tipo && item.asesor_id === asesorId);
      const otros = items.filter((item) => item.tipo === tipo);
      return propios[0] ?? otros[0];
    };
    const entradaRaw = pickTipo("entrada");
    const salidaRaw = pickTipo("salida");

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

    const candidatosCorrida = [entradaRaw?.asesor_id, salidaRaw?.asesor_id].filter(
      (id): id is string => Boolean(id),
    );
    const cubiertoPorCorrida = candidatosCorrida.some((id) =>
      isGuardiaCorridaCompleta(marcajesByAsesor.get(id) ?? []),
    );

    let cumplimiento: GuardiaMarcajeAdminRow["cumplimiento"] = "sin_publicar";
    if (estadoAsignacion === "publicada") {
      if ((entrada && salida) || cubiertoPorCorrida) {
        cumplimiento = "completo";
      } else if (!entrada && !cubiertoPorCorrida) {
        cumplimiento = "pendiente_entrada";
      } else {
        cumplimiento = "pendiente_salida";
      }
    }

    const marcoAsesorId =
      entradaRaw?.asesor_id && entradaRaw.asesor_id !== asesorId
        ? entradaRaw.asesor_id
        : salidaRaw?.asesor_id && salidaRaw.asesor_id !== asesorId
          ? salidaRaw.asesor_id
          : null;

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
      coberturaPor:
        marcoAsesorId != null
          ? { asesorId: marcoAsesorId, asesorNombre: asesorNames[marcoAsesorId] ?? null }
          : null,
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
