import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  formatSolicitudApartadoEmailHint,
  sendSolicitudApartadoEmail,
  type SolicitudApartadoEmailResult,
} from "@/lib/email/send-solicitud-apartado";

export type SolicitudApartadoEstado = "pendiente" | "atendida" | "cancelada";

export type SolicitudApartadoRecord = {
  id: string;
  prospecto_id: string;
  desarrollo_id: string;
  asesor_id: string;
  unidad_id: string | null;
  cotizacion_id: string | null;
  notas: string | null;
  estado: SolicitudApartadoEstado;
  atendida_por: string | null;
  atendida_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SolicitudApartadoRow = SolicitudApartadoRecord & {
  prospectoNombre?: string;
  asesorNombre?: string;
  unidadNumero?: string | null;
};

const mapRow = (row: Record<string, unknown>): SolicitudApartadoRow => ({
  id: row.id as string,
  prospecto_id: row.prospecto_id as string,
  desarrollo_id: row.desarrollo_id as string,
  asesor_id: row.asesor_id as string,
  unidad_id: (row.unidad_id as string | null) ?? null,
  cotizacion_id: (row.cotizacion_id as string | null) ?? null,
  notas: (row.notas as string | null) ?? null,
  estado: row.estado as SolicitudApartadoEstado,
  atendida_por: (row.atendida_por as string | null) ?? null,
  atendida_at: (row.atendida_at as string | null) ?? null,
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
  prospectoNombre: (row.prospecto as { nombre?: string } | null)?.nombre,
  asesorNombre: (row.asesor as { nombre?: string } | null)?.nombre,
  unidadNumero: (row.unidad as { unidad?: string } | null)?.unidad ?? null,
});

export const cancelSolicitudesApartadoForProspectos = async (
  prospectoIds: string[],
): Promise<void> => {
  const uniqueIds = Array.from(new Set(prospectoIds.filter(Boolean)));
  if (!uniqueIds.length) {
    return;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  await supabase
    .from("solicitudes_apartado")
    .update({
      estado: "cancelada",
      updated_at: new Date().toISOString(),
    })
    .in("prospecto_id", uniqueIds)
    .eq("estado", "pendiente");
};

const isProspectoActivo = (row: Record<string, unknown>): boolean => {
  const prospecto = row.prospecto as { activo?: boolean } | null;
  return prospecto?.activo !== false;
};

export const getSolicitudApartadoPendiente = async (
  prospectoId: string,
): Promise<SolicitudApartadoRow | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("solicitudes_apartado")
    .select(
      "*, prospecto:prospectos(nombre, activo), asesor:asesores(nombre), unidad:disponibilidad_unidades(unidad)",
    )
    .eq("prospecto_id", prospectoId)
    .eq("estado", "pendiente")
    .maybeSingle();

  if (!data || !isProspectoActivo(data as Record<string, unknown>)) {
    return null;
  }

  return mapRow(data as Record<string, unknown>);
};

export const listSolicitudesApartadoPendientes = async (
  desarrolloId: string,
): Promise<SolicitudApartadoRow[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("solicitudes_apartado")
    .select(
      "*, prospecto:prospectos(nombre, activo), asesor:asesores(nombre), unidad:disponibilidad_unidades(unidad)",
    )
    .eq("desarrollo_id", desarrolloId)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Record<string, unknown>[];
  const activas = rows.filter(isProspectoActivo);
  const inactivas = rows.filter((row) => !isProspectoActivo(row));

  if (inactivas.length) {
    await cancelSolicitudesApartadoForProspectos(
      inactivas.map((row) => row.prospecto_id as string),
    );
  }

  return activas.map((row) => mapRow(row));
};

export type CreateSolicitudApartadoResult = {
  solicitud: SolicitudApartadoRow;
  email: SolicitudApartadoEmailResult;
  emailHint: string;
};

export const createSolicitudApartado = async (input: {
  prospectoId: string;
  desarrolloId: string;
  asesorId: string;
  asesorNombre: string;
  prospectoNombre: string;
  desarrolloNombre: string;
  unidadId?: string;
  cotizacionId?: string;
  notas?: string;
}): Promise<CreateSolicitudApartadoResult> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const existing = await getSolicitudApartadoPendiente(input.prospectoId);
  if (existing) {
    throw new Error("Ya hay una solicitud de apartado pendiente para este prospecto.");
  }

  const { data: operacion } = await supabase
    .from("operaciones_comerciales")
    .select("id")
    .eq("prospecto_id", input.prospectoId)
    .eq("cancelada", false)
    .maybeSingle();

  if (operacion) {
    throw new Error("Este prospecto ya tiene un apartado registrado.");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("solicitudes_apartado")
    .insert({
      prospecto_id: input.prospectoId,
      desarrollo_id: input.desarrolloId,
      asesor_id: input.asesorId,
      unidad_id: input.unidadId ?? null,
      cotizacion_id: input.cotizacionId ?? null,
      notas: input.notas?.trim() || null,
      estado: "pendiente",
      created_at: now,
      updated_at: now,
    })
    .select(
      "*, prospecto:prospectos(nombre), asesor:asesores(nombre), unidad:disponibilidad_unidades(unidad)",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la solicitud.");
  }

  const solicitud = mapRow(data as Record<string, unknown>);

  const email = await sendSolicitudApartadoEmail({
    desarrolloId: input.desarrolloId,
    desarrolloNombre: input.desarrolloNombre,
    prospectoId: input.prospectoId,
    prospectoNombre: input.prospectoNombre,
    asesorNombre: input.asesorNombre,
    notas: input.notas,
    unidadNumero: solicitud.unidadNumero,
  });

  return {
    solicitud,
    email,
    emailHint: formatSolicitudApartadoEmailHint(email),
  };
};

export const getSolicitudApartadoPendienteById = async (
  solicitudId: string,
): Promise<SolicitudApartadoRow | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("solicitudes_apartado")
    .select(
      "*, prospecto:prospectos(nombre, activo), asesor:asesores(nombre), unidad:disponibilidad_unidades(unidad)",
    )
    .eq("id", solicitudId)
    .eq("estado", "pendiente")
    .maybeSingle();

  if (!data || !isProspectoActivo(data as Record<string, unknown>)) {
    return null;
  }

  return mapRow(data as Record<string, unknown>);
};

export const rejectSolicitudApartado = async (
  solicitudId: string,
): Promise<SolicitudApartadoRow> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase
    .from("solicitudes_apartado")
    .update({
      estado: "cancelada",
      updated_at: new Date().toISOString(),
    })
    .eq("id", solicitudId)
    .eq("estado", "pendiente")
    .select(
      "*, prospecto:prospectos(nombre), asesor:asesores(nombre), unidad:disponibilidad_unidades(unidad)",
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("No hay solicitud de apartado pendiente para rechazar.");
  }

  return mapRow(data as Record<string, unknown>);
};

export const markSolicitudApartadoAtendida = async (
  prospectoId: string,
  atendidaPor?: string | null,
): Promise<void> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  await supabase
    .from("solicitudes_apartado")
    .update({
      estado: "atendida",
      atendida_por: atendidaPor ?? null,
      atendida_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("prospecto_id", prospectoId)
    .eq("estado", "pendiente");
};
