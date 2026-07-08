import { assertAsesorDesarrollo } from "@/lib/asesores/prospectos-service";
import {
  GUARDIA_CASETA_FALLBACK,
  GUARDIA_RADIO_METROS_DEFAULT,
  evaluarMarcajeCaseta,
  formatCasetaEtiquetaResumen,
  isValidGeoCoordinate,
  type GuardiaCasetaConfig,
  type GuardiaCasetaPunto,
} from "@/lib/comercial/guardia-caseta";
import type { GuardiaMarcajeResumen, GuardiaMarcajeTipo } from "@/lib/comercial/guardia-marcaje-types";
import {
  formatDateYmd,
  guardiaTurnoLabel,
  guardiaTurnoShortLabel,
  isGuardiaTurno,
  type GuardiaTurno,
} from "@/lib/comercial/guardias";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type AsesorGuardiaHoy = {
  asignacionId: string;
  fecha: string;
  turno: GuardiaTurno;
  turnoLabel: string;
  turnoShortLabel: string;
  horario: string;
  notas: string | null;
  marcajes: {
    entrada: GuardiaMarcajeResumen | null;
    salida: GuardiaMarcajeResumen | null;
  };
  caseta: {
    etiqueta: string | null;
    radioMetros: number;
  };
  pendiente: GuardiaMarcajeTipo | null;
};

type CasetaRow = {
  desarrollo_id: string;
  lat: number;
  lng: number;
  radio_metros: number;
  etiqueta: string | null;
  puntos_extra?: unknown;
};

type CasetaPuntoExtraRow = {
  lat?: unknown;
  lng?: unknown;
  radio_metros?: unknown;
  radioMetros?: unknown;
  etiqueta?: unknown;
};

const parseCasetaPuntosExtra = (value: unknown): GuardiaCasetaPunto[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const row = item as CasetaPuntoExtraRow;
    const lat = row.lat;
    const lng = row.lng;
    const radioRaw = row.radio_metros ?? row.radioMetros;
    const radioMetros =
      typeof radioRaw === "number" && Number.isFinite(radioRaw) && radioRaw > 0
        ? radioRaw
        : GUARDIA_RADIO_METROS_DEFAULT;

    if (typeof lat !== "number" || typeof lng !== "number" || !isValidGeoCoordinate(lat, lng)) {
      return [];
    }

    return [
      {
        lat,
        lng,
        radioMetros,
        etiqueta: typeof row.etiqueta === "string" ? row.etiqueta : null,
      },
    ];
  });
};

const mapCasetaRow = (row: CasetaRow): GuardiaCasetaConfig => ({
  desarrolloId: row.desarrollo_id,
  lat: row.lat,
  lng: row.lng,
  radioMetros: row.radio_metros,
  etiqueta: row.etiqueta,
  puntosExtra: parseCasetaPuntosExtra(row.puntos_extra),
});

type MarcajeRow = {
  id: string;
  asignacion_id: string;
  asesor_id: string;
  desarrollo_id: string;
  fecha: string;
  turno: string;
  tipo: string;
  registrado_at: string;
  lat: number;
  lng: number;
  accuracy_metros: number | null;
  distancia_metros: number;
  dentro_radio: boolean;
};

function assertMarcajesTable(message: string) {
  if (message.includes("guardia_marcajes") || message.includes("guardia_caseta_config")) {
    throw new Error("Falta aplicar la migración 044_guardia_marcajes.sql en Supabase.");
  }
}

function toMarcajeResumen(row: MarcajeRow): GuardiaMarcajeResumen {
  return {
    tipo: row.tipo as GuardiaMarcajeTipo,
    registradoAt: row.registrado_at,
    distanciaMetros: row.distancia_metros,
    dentroRadio: row.dentro_radio,
  };
}

export async function hasGuardiaCasetaConfig(desarrolloId: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return desarrolloId in GUARDIA_CASETA_FALLBACK;
  }

  const { data, error } = await supabase
    .from("guardia_caseta_config")
    .select("desarrollo_id")
    .eq("desarrollo_id", desarrolloId)
    .maybeSingle();

  if (error) {
    assertMarcajesTable(error.message);
    return false;
  }

  return Boolean(data);
}

export async function getCasetaConfig(desarrolloId: string): Promise<GuardiaCasetaConfig> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    const fallback = GUARDIA_CASETA_FALLBACK[desarrolloId];
    if (!fallback) {
      throw new Error("Caseta no configurada para este desarrollo.");
    }
    return fallback;
  }

  const { data, error } = await supabase
    .from("guardia_caseta_config")
    .select("desarrollo_id, lat, lng, radio_metros, etiqueta, puntos_extra")
    .eq("desarrollo_id", desarrolloId)
    .maybeSingle();

  if (error) {
    assertMarcajesTable(error.message);
    throw new Error(error.message);
  }

  if (data) {
    return mapCasetaRow(data as CasetaRow);
  }

  const fallback = GUARDIA_CASETA_FALLBACK[desarrolloId];
  if (!fallback) {
    throw new Error("Caseta no configurada para este desarrollo.");
  }
  return fallback;
}

async function listMarcajesForAsignaciones(asignacionIds: string[]): Promise<Map<string, MarcajeRow[]>> {
  const map = new Map<string, MarcajeRow[]>();
  if (!asignacionIds.length) {
    return map;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return map;
  }

  const { data, error } = await supabase
    .from("guardia_marcajes")
    .select("*")
    .in("asignacion_id", asignacionIds);

  if (error) {
    if (error.message.includes("guardia_marcajes")) {
      return map;
    }
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as MarcajeRow[]) {
    const list = map.get(row.asignacion_id) ?? [];
    list.push(row);
    map.set(row.asignacion_id, list);
  }

  return map;
}

function resolvePendiente(
  entrada: GuardiaMarcajeResumen | null,
  salida: GuardiaMarcajeResumen | null,
): GuardiaMarcajeTipo | null {
  if (!entrada) {
    return "entrada";
  }
  if (!salida) {
    return "salida";
  }
  return null;
}

export const getGuardiasHoyForAsesor = async (
  asesorId: string,
  desarrolloId: string,
): Promise<AsesorGuardiaHoy[]> => {
  await assertAsesorDesarrollo(asesorId, desarrolloId);

  if (!(await hasGuardiaCasetaConfig(desarrolloId))) {
    return [];
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const today = formatDateYmd(new Date());
  const caseta = await getCasetaConfig(desarrolloId);

  const { data, error } = await supabase
    .from("guardia_asignaciones")
    .select("id, fecha, turno, notas")
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

  const asignacionIds = (data ?? []).map((row) => row.id as string);
  const marcajesByAsignacion = await listMarcajesForAsignaciones(asignacionIds);

  return (data ?? []).map((row) => {
    const turno = row.turno as GuardiaTurno;
    const marcajesRows = marcajesByAsignacion.get(row.id as string) ?? [];
    const entradaRow = marcajesRows.find((item) => item.tipo === "entrada");
    const salidaRow = marcajesRows.find((item) => item.tipo === "salida");
    const entrada = entradaRow ? toMarcajeResumen(entradaRow) : null;
    const salida = salidaRow ? toMarcajeResumen(salidaRow) : null;

    return {
      asignacionId: row.id as string,
      fecha: row.fecha as string,
      turno,
      turnoLabel: guardiaTurnoShortLabel[turno],
      turnoShortLabel: guardiaTurnoShortLabel[turno],
      horario: guardiaTurnoLabel[turno],
      notas: (row.notas as string | null) ?? null,
      marcajes: { entrada, salida },
      caseta: {
        etiqueta: formatCasetaEtiquetaResumen(caseta),
        radioMetros: caseta.radioMetros,
      },
      pendiente: resolvePendiente(entrada, salida),
    };
  });
};

export async function registerGuardiaMarcaje(input: {
  asesorId: string;
  desarrolloId: string;
  turno: string;
  tipo: string;
  lat: number;
  lng: number;
  accuracyMetros?: number | null;
}): Promise<GuardiaMarcajeResumen> {
  await assertAsesorDesarrollo(input.asesorId, input.desarrolloId);

  if (!(await hasGuardiaCasetaConfig(input.desarrolloId))) {
    throw new Error("Marcajes de guardia no están activos para este desarrollo.");
  }

  if (!isGuardiaTurno(input.turno)) {
    throw new Error("Turno inválido.");
  }

  if (input.tipo !== "entrada" && input.tipo !== "salida") {
    throw new Error("Tipo de marcaje inválido.");
  }

  if (!isValidGeoCoordinate(input.lat, input.lng)) {
    throw new Error("Ubicación GPS inválida.");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const today = formatDateYmd(new Date());
  const turno = input.turno;

  const { data: asignacion, error: asignacionError } = await supabase
    .from("guardia_asignaciones")
    .select("id, estado")
    .eq("desarrollo_id", input.desarrolloId)
    .eq("asesor_id", input.asesorId)
    .eq("fecha", today)
    .eq("turno", turno)
    .maybeSingle();

  if (asignacionError) {
    throw new Error(asignacionError.message);
  }

  if (!asignacion || asignacion.estado !== "publicada") {
    throw new Error("No tienes guardia publicada para este turno hoy.");
  }

  const asignacionId = asignacion.id as string;

  const { data: existing, error: existingError } = await supabase
    .from("guardia_marcajes")
    .select("tipo")
    .eq("asignacion_id", asignacionId);

  if (existingError) {
    assertMarcajesTable(existingError.message);
    throw new Error(existingError.message);
  }

  const tipos = new Set((existing ?? []).map((row) => row.tipo as string));

  if (tipos.has(input.tipo)) {
    throw new Error(
      input.tipo === "entrada"
        ? "Ya registraste tu entrada para este turno."
        : "Ya registraste tu salida para este turno.",
    );
  }

  if (input.tipo === "salida" && !tipos.has("entrada")) {
    throw new Error("Debes registrar entrada antes de la salida.");
  }

  const caseta = await getCasetaConfig(input.desarrolloId);
  const evaluacion = evaluarMarcajeCaseta(input.lat, input.lng, caseta);
  const distanciaMetros = evaluacion.distanciaMetros;
  const dentroRadio = evaluacion.dentroRadio;

  if (!dentroRadio) {
    const ubicaciones =
      formatCasetaEtiquetaResumen(caseta) ?? "oficina comercial o caseta de ventas";
    throw new Error(
      `Estás a ${Math.round(distanciaMetros)} m del punto más cercano. Debes estar a ${evaluacion.radioMetros} m o menos (${ubicaciones}).`,
    );
  }

  const payload = {
    asignacion_id: asignacionId,
    asesor_id: input.asesorId,
    desarrollo_id: input.desarrolloId,
    fecha: today,
    turno,
    tipo: input.tipo,
    lat: input.lat,
    lng: input.lng,
    accuracy_metros: input.accuracyMetros ?? null,
    distancia_metros: distanciaMetros,
    dentro_radio: dentroRadio,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("guardia_marcajes")
    .insert(payload)
    .select("*")
    .single();

  if (insertError) {
    assertMarcajesTable(insertError.message);
    if (/duplicate|unique/i.test(insertError.message)) {
      throw new Error("Este marcaje ya fue registrado.");
    }
    throw new Error(insertError.message);
  }

  return toMarcajeResumen(inserted as MarcajeRow);
};

export { GUARDIA_RADIO_METROS_DEFAULT };
