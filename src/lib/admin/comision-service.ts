import { assertDesarrolloAccess, isSuperAdmin } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import { getExpedienteDetail } from "@/lib/admin/expediente-service";
import {
  evaluarElegibilidadComision,
  type ComisionPagoTrigger,
} from "@/lib/comercial/comision-reglas";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type SolicitudComisionRecord = {
  id: string;
  operacion_id: string;
  desarrollo_id: string;
  asesor_id: string | null;
  estado: "pendiente" | "autorizada" | "rechazada" | "facturada";
  trigger_pago: ComisionPagoTrigger;
  comision_pct: number | null;
  porcentaje_pago: number;
  precio_venta: number | null;
  monto_comision_total: number | null;
  monto_solicitado: number;
  notas: string | null;
  motivo_rechazo: string | null;
  solicitado_por: string | null;
  autorizado_por: string | null;
  autorizado_at: string | null;
  facturado_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SolicitudComisionListRow = SolicitudComisionRecord & {
  clienteNombre: string;
  unidadNumero: string;
  esquemaPago: string | null;
};

export type SolicitudesComisionResumen = {
  pendiente: number;
  autorizada: number;
  rechazada: number;
  facturada: number;
  total: number;
};

const emptyResumen = (): SolicitudesComisionResumen => ({
  pendiente: 0,
  autorizada: 0,
  rechazada: 0,
  facturada: 0,
  total: 0,
});

export const listSolicitudesComisionRows = async (
  filters: { desarrolloId?: string; estado?: string },
  profile: AdminProfile,
): Promise<{ solicitudes: SolicitudComisionListRow[]; resumen: SolicitudesComisionResumen }> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { solicitudes: [], resumen: emptyResumen() };
  }

  let query = supabase.from("solicitudes_comision").select("*").order("created_at", { ascending: false });

  if (filters.desarrolloId) {
    assertDesarrolloAccess(profile, filters.desarrolloId);
    query = query.eq("desarrollo_id", filters.desarrolloId);
  } else if (!isSuperAdmin(profile)) {
    if (!profile.desarrollosIds.length) {
      return { solicitudes: [], resumen: emptyResumen() };
    }
    query = query.in("desarrollo_id", profile.desarrollosIds);
  }

  if (filters.estado) {
    query = query.eq("estado", filters.estado);
  }

  const { data, error } = await query;
  if (error) {
    if (error.message.includes("solicitudes_comision")) {
      throw new Error("Falta aplicar la migración 023_expediente_comisiones.sql en Supabase.");
    }
    throw new Error(error.message);
  }

  const solicitudes = (data ?? []) as SolicitudComisionRecord[];
  const resumen = emptyResumen();
  for (const row of solicitudes) {
    resumen.total += 1;
    if (row.estado === "pendiente") {
      resumen.pendiente += 1;
    } else if (row.estado === "autorizada") {
      resumen.autorizada += 1;
    } else if (row.estado === "rechazada") {
      resumen.rechazada += 1;
    } else if (row.estado === "facturada") {
      resumen.facturada += 1;
    }
  }

  if (!solicitudes.length) {
    return { solicitudes: [], resumen };
  }

  const operacionIds = Array.from(new Set(solicitudes.map((row) => row.operacion_id)));
  const { data: operaciones, error: operacionesError } = await supabase
    .from("operaciones_comerciales")
    .select("id, cliente_nombre, unidad_id, esquema_pago")
    .in("id", operacionIds);

  if (operacionesError) {
    throw new Error(operacionesError.message);
  }

  const unidadIds = Array.from(
    new Set((operaciones ?? []).map((row) => row.unidad_id as string).filter(Boolean)),
  );
  const { data: unidades } = unidadIds.length
    ? await supabase.from("disponibilidad_unidades").select("id, unidad").in("id", unidadIds)
    : { data: [] };

  const unidadById = new Map((unidades ?? []).map((row) => [row.id as string, row.unidad as string]));
  const operacionById = new Map(
    (operaciones ?? []).map((row) => [
      row.id as string,
      {
        clienteNombre: row.cliente_nombre as string,
        unidadNumero: unidadById.get(row.unidad_id as string) ?? "—",
        esquemaPago: (row.esquema_pago as string) ?? null,
      },
    ]),
  );

  const rows = solicitudes.map((row) => {
    const op = operacionById.get(row.operacion_id);
    return {
      ...row,
      clienteNombre: op?.clienteNombre ?? "—",
      unidadNumero: op?.unidadNumero ?? "—",
      esquemaPago: op?.esquemaPago ?? null,
    };
  });

  return { solicitudes: rows, resumen };
};

export const listSolicitudesComision = async (
  filters: { desarrolloId: string; operacionId?: string; estado?: string },
  profile: AdminProfile,
) => {
  assertDesarrolloAccess(profile, filters.desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("solicitudes_comision")
    .select("*")
    .eq("desarrollo_id", filters.desarrolloId)
    .order("created_at", { ascending: false });

  if (filters.operacionId) {
    query = query.eq("operacion_id", filters.operacionId);
  }
  if (filters.estado) {
    query = query.eq("estado", filters.estado);
  }

  const { data, error } = await query;
  if (error) {
    if (error.message.includes("solicitudes_comision")) {
      throw new Error("Falta aplicar la migración 023_expediente_comisiones.sql en Supabase.");
    }
    throw new Error(error.message);
  }

  return (data ?? []) as SolicitudComisionRecord[];
};

export const getComisionContext = async (operacionId: string, profile: AdminProfile) => {
  const detail = await getExpedienteDetail(operacionId, profile);
  if (!detail) {
    throw new Error("Operación no encontrada.");
  }

  const op = detail.operacion;
  const engancheCubierto = Boolean((op as { enganche_cubierto?: boolean }).enganche_cubierto);
  const elegibilidad = evaluarElegibilidadComision({
    desarrolloId: op.desarrollo_id,
    precioVenta: op.precio_venta ? Number(op.precio_venta) : null,
    esquemaPago: op.esquema_pago,
    engancheCubierto,
    formalizacionCompleta: detail.progreso.formalizacionCompleta,
    escriturado: op.escriturado,
  });

  const solicitudes = await listSolicitudesComision(
    { desarrolloId: op.desarrollo_id, operacionId },
    profile,
  );

  return { detail, elegibilidad, solicitudes };
};

export const crearSolicitudComision = async (input: {
  operacionId: string;
  notas?: string;
  trigger?: ComisionPagoTrigger;
  adminId: string;
  profile: AdminProfile;
}) => {
  const { detail, solicitudes } = await getComisionContext(input.operacionId, input.profile);

  const elegibilidadTrigger = evaluarElegibilidadComision({
    desarrolloId: detail.operacion.desarrollo_id,
    precioVenta: detail.operacion.precio_venta ? Number(detail.operacion.precio_venta) : null,
    esquemaPago: detail.operacion.esquema_pago,
    engancheCubierto: Boolean((detail.operacion as { enganche_cubierto?: boolean }).enganche_cubierto),
    formalizacionCompleta: detail.progreso.formalizacionCompleta,
    escriturado: detail.operacion.escriturado,
    trigger: input.trigger,
  });

  if (!elegibilidadTrigger.elegible || !elegibilidadTrigger.pagoRegla) {
    throw new Error(elegibilidadTrigger.razones.join(" ") || "No cumple requisitos para solicitar comisión.");
  }

  const pendiente = solicitudes.find(
    (item: SolicitudComisionRecord) =>
      item.estado === "pendiente" &&
      item.trigger_pago === elegibilidadTrigger.pagoRegla!.trigger,
  );
  if (pendiente) {
    throw new Error("Ya existe una solicitud pendiente para este hito de pago.");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase
    .from("solicitudes_comision")
    .insert({
      operacion_id: input.operacionId,
      desarrollo_id: detail.operacion.desarrollo_id,
      asesor_id: detail.operacion.prospecto_id ? null : null,
      estado: "pendiente",
      trigger_pago: elegibilidadTrigger.pagoRegla.trigger,
      comision_pct: elegibilidadTrigger.regla?.comisionPct ?? null,
      porcentaje_pago: elegibilidadTrigger.pagoRegla.porcentajePago,
      precio_venta: detail.operacion.precio_venta,
      monto_comision_total: elegibilidadTrigger.comisionTotal,
      monto_solicitado: elegibilidadTrigger.montoSolicitud ?? 0,
      notas: input.notas?.trim() || null,
      solicitado_por: input.adminId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SolicitudComisionRecord;
};

export const resolverSolicitudComision = async (input: {
  solicitudId: string;
  accion: "autorizar" | "rechazar" | "facturar";
  motivoRechazo?: string;
  adminId: string;
  profile: AdminProfile;
}) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: solicitud, error } = await supabase
    .from("solicitudes_comision")
    .select("*")
    .eq("id", input.solicitudId)
    .maybeSingle();

  if (error || !solicitud) {
    throw new Error("Solicitud no encontrada.");
  }

  assertDesarrolloAccess(input.profile, solicitud.desarrollo_id as string);

  const now = new Date().toISOString();
  let patch: Record<string, unknown> = { updated_at: now };

  if (input.accion === "autorizar") {
    if (solicitud.estado !== "pendiente") {
      throw new Error("Solo se autorizan solicitudes pendientes.");
    }
    patch = {
      ...patch,
      estado: "autorizada",
      autorizado_por: input.adminId,
      autorizado_at: now,
      motivo_rechazo: null,
    };
  } else if (input.accion === "rechazar") {
    if (solicitud.estado !== "pendiente") {
      throw new Error("Solo se rechazan solicitudes pendientes.");
    }
    patch = {
      ...patch,
      estado: "rechazada",
      motivo_rechazo: input.motivoRechazo?.trim() || "Rechazada por administración.",
      autorizado_por: input.adminId,
      autorizado_at: now,
    };
  } else {
    if (solicitud.estado !== "autorizada") {
      throw new Error("Solo se facturan solicitudes autorizadas.");
    }
    patch = { ...patch, estado: "facturada", facturado_at: now };
  }

  const { data, error: updateError } = await supabase
    .from("solicitudes_comision")
    .update(patch)
    .eq("id", input.solicitudId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return data as SolicitudComisionRecord;
};
