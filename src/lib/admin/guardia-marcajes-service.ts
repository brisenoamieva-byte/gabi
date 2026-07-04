import { assertDesarrolloAccess } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import { getCasetaConfig } from "@/lib/asesores/guardias-service";
import type { GuardiaMarcajeTipo } from "@/lib/comercial/guardia-marcaje-types";
import {
  formatDateYmd,
  guardiaTurnoShortLabel,
  isGuardiaTurno,
  type GuardiaTurno,
} from "@/lib/comercial/guardias";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type GuardiaMarcajeAdminRow = {
  asignacionId: string;
  asesorId: string;
  asesorNombre: string | null;
  fecha: string;
  turno: GuardiaTurno;
  turnoLabel: string;
  estadoAsignacion: string;
  entrada: {
    registradoAt: string;
    distanciaMetros: number;
  } | null;
  salida: {
    registradoAt: string;
    distanciaMetros: number;
  } | null;
  cumplimiento: "completo" | "pendiente_entrada" | "pendiente_salida" | "sin_publicar";
};

export type GuardiaMarcajesDiaPayload = {
  fecha: string;
  desarrolloId: string;
  caseta: {
    etiqueta: string | null;
    radioMetros: number;
    lat: number;
    lng: number;
  };
  filas: GuardiaMarcajeAdminRow[];
};

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
    caseta: {
      etiqueta: caseta.etiqueta,
      radioMetros: caseta.radioMetros,
      lat: caseta.lat,
      lng: caseta.lng,
    },
    filas,
  };
}

export function formatMarcajeHora(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Mexico_City",
  }).format(new Date(iso));
}

export function guardiaMarcajeCumplimientoLabel(
  cumplimiento: GuardiaMarcajeAdminRow["cumplimiento"],
): string {
  switch (cumplimiento) {
    case "completo":
      return "Completo";
    case "pendiente_entrada":
      return "Sin entrada";
    case "pendiente_salida":
      return "Sin salida";
    default:
      return "No publicada";
  }
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
