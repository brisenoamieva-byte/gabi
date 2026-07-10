import { getSembradoSegmentsForDesarrollo } from "@/lib/catalog/desarrollos-registry";
import type { DesarrolloSembradoSegment } from "@/lib/catalog/desarrollos-registry";
import { listAsesores } from "@/lib/admin/asesores-service";
import { canAccessDesarrollo, isSuperAdmin } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import { getProspectoById } from "@/lib/admin/prospectos-service";
import { prospectoEtapaFromSembrado } from "@/lib/comercial/prospecto-etapas";
import { resolveMedioPublicitarioFromProspecto } from "@/lib/comercial/apartado-form-options";
import { markSolicitudApartadoAtendida } from "@/lib/comercial/solicitud-apartado-service";
import { resolveUnidadEstatus } from "@/lib/comercial/unidad-disponibilidad";
import {
  sembradoToInventarioEstatus,
  type OperacionComercialRecord,
  type SembradoUnidadRow,
  type UnidadCuracionInput,
} from "@/lib/comercial/sembrado-status";
import {
  syncSuperficieLegacyFields,
  type ProductoRecomendadoRecord,
} from "@/lib/inventario/productos-recomendados";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const listOperaciones = async (
  filters: { desarrolloId: string; includeCanceladas?: boolean },
  profile?: AdminProfile,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  if (profile && !canAccessDesarrollo(profile, filters.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  let query = supabase
    .from("operaciones_comerciales")
    .select("*")
    .eq("desarrollo_id", filters.desarrolloId)
    .order("updated_at", { ascending: false });

  if (!filters.includeCanceladas) {
    query = query.eq("cancelada", false);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OperacionComercialRecord[];
};

export const listSembradoUnidades = async (
  filters: { desarrolloId: string; clusterId?: string; estatusSembrado?: string },
  profile?: AdminProfile,
): Promise<SembradoUnidadRow[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  if (profile && !canAccessDesarrollo(profile, filters.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  let unidadesQuery = supabase
    .from("disponibilidad_unidades")
    .select("*")
    .eq("desarrollo_id", filters.desarrolloId)
    .eq("activo", true)
    .order("unidad", { ascending: true });

  if (filters.clusterId) {
    unidadesQuery = unidadesQuery.eq("cluster_id", filters.clusterId);
  }

  if (profile && !isSuperAdmin(profile) && !profile.desarrollosIds.includes(filters.desarrolloId)) {
    return [];
  }

  const [{ data: unidades, error: unidadesError }, { data: operaciones, error: operacionesError }] =
    await Promise.all([
      unidadesQuery,
      supabase
        .from("operaciones_comerciales")
        .select("*")
        .eq("desarrollo_id", filters.desarrolloId)
        .eq("cancelada", false),
    ]);

  if (unidadesError) {
    throw new Error(unidadesError.message);
  }
  if (operacionesError) {
    throw new Error(operacionesError.message);
  }

  const operacionByUnidad = new Map<string, OperacionComercialRecord>();
  for (const op of (operaciones ?? []) as OperacionComercialRecord[]) {
    operacionByUnidad.set(op.unidad_id, op);
  }

  const operacionIds = (operaciones ?? []).map((item) => item.id);
  const cobranzaByOperacion = new Map<string, number>();

  if (operacionIds.length) {
    const { data: cobranza, error: cobranzaError } = await supabase
      .from("cobranza_mensual")
      .select("operacion_id, monto")
      .in("operacion_id", operacionIds);

    if (cobranzaError) {
      throw new Error(cobranzaError.message);
    }

    for (const row of cobranza ?? []) {
      const current = cobranzaByOperacion.get(row.operacion_id) ?? 0;
      cobranzaByOperacion.set(row.operacion_id, current + Number(row.monto ?? 0));
    }
  }

  const rows: SembradoUnidadRow[] = [];

  for (const unit of (unidades ?? []) as ProductoRecomendadoRecord[]) {
    const operacion = operacionByUnidad.get(unit.id) ?? null;

    if (filters.estatusSembrado) {
      const estatus = operacion?.estatus_sembrado ?? "Disponibles";
      if (estatus !== filters.estatusSembrado) {
        continue;
      }
    }

    rows.push({
      unidadId: unit.id,
      unidad: unit.unidad,
      tipo: unit.tipo,
      clusterId: unit.cluster_id,
      listaPrecios: unit.lista_precios ?? operacion?.lista_precios ?? null,
      precio: unit.precio ?? operacion?.precio_lista ?? null,
      prototipoId: unit.prototipo_id ?? null,
      superficieTerrenoM2: unit.superficie_terreno_m2 ?? null,
      superficieConstruccionM2: unit.superficie_construccion_m2 ?? null,
      etapa: unit.etapa ?? null,
      orden: unit.orden ?? 0,
      visitable: unit.visitable ?? false,
      prioridadComercial: unit.prioridad_comercial ?? "media",
      razonesVenta: unit.razones_venta ?? [],
      ubicacionComercial: unit.ubicacion_comercial ?? null,
      instruccionRecorrido: unit.instruccion_recorrido ?? null,
      notaAcceso: unit.nota_acceso ?? null,
      estatusInventario: resolveUnidadEstatus(unit.estatus, operacion),
      entregado: unit.entregado ?? false,
      escriturado: unit.escriturado ?? false,
      operacion,
      totalCobrado: operacion ? (cobranzaByOperacion.get(operacion.id) ?? 0) : 0,
    });
  }

  return rows;
};

export const getSembradoResumen = async (
  desarrolloId: string,
  profile?: AdminProfile,
  clusterId?: string,
) => {
  const rows = await listSembradoUnidades({ desarrolloId, clusterId }, profile);
  const resumen: Record<string, number> = { Disponibles: 0 };

  for (const row of rows) {
    const key =
      row.operacion?.estatus_sembrado ??
      (row.estatusInventario === "apartado" ? "Apartado pendiente" : "Disponibles");
    resumen[key] = (resumen[key] ?? 0) + 1;
  }

  return {
    total: rows.length,
    porEstatus: resumen,
  };
};

export type SembradoReporteSegmento = {
  id: string;
  label: string;
  total: number;
  conOperacion: number;
  apartadosPendientes: number;
  porEstatus: Record<string, number>;
};

export type SembradoReporte = {
  total: number;
  conOperacion: number;
  apartadosPendientes: number;
  porEstatus: Record<string, number>;
  segmentos: SembradoReporteSegmento[];
};

const buildSembradoReporteFromRows = (rows: SembradoUnidadRow[]) => {
  const porEstatus: Record<string, number> = {};
  let conOperacion = 0;
  let apartadosPendientes = 0;

  for (const row of rows) {
    const apartadoPendiente = !row.operacion && row.estatusInventario === "apartado";
    const estatus =
      row.operacion?.estatus_sembrado ??
      (apartadoPendiente ? "Apartado pendiente" : "Disponibles");

    porEstatus[estatus] = (porEstatus[estatus] ?? 0) + 1;

    if (row.operacion && !row.operacion.cancelada) {
      conOperacion += 1;
    }
    if (apartadoPendiente) {
      apartadosPendientes += 1;
    }
  }

  return {
    total: rows.length,
    conOperacion,
    apartadosPendientes,
    porEstatus,
  };
};

export const getSembradoReporte = async (
  desarrolloId: string,
  profile?: AdminProfile,
): Promise<SembradoReporte> => {
  const rows = await listSembradoUnidades({ desarrolloId }, profile);
  const base = buildSembradoReporteFromRows(rows);

  const segmentConfigs = getSembradoSegmentsForDesarrollo(desarrolloId);

  const segmentos = segmentConfigs.map((config) => ({
    id: config.id,
    label: config.label,
    ...buildSembradoReporteFromRows(rows.filter((row) => row.clusterId === config.clusterId)),
  }));

  return { ...base, segmentos };
};

export type CreateApartadoInput = {
  desarrolloId: string;
  unidadId: string;
  prospectoId?: string;
  cotizacionId?: string;
  clienteNombre: string;
  estatusSembrado?: string;
  origenCiudad?: string;
  equipoVenta?: string;
  promotorNombre?: string;
  tipoInversion?: string | null;
  listaPrecios?: string;
  precioLista?: number | null;
  descuentoPct?: number | null;
  precioVenta?: number | null;
  esquemaPago?: string;
  fechaApartado?: string;
  fechaCierre?: string;
  medioPublicitario?: string;
  observacionesPagos?: string;
  observaciones?: string;
  primerPago?: number | null;
  prospectoEmail?: string;
  prospectoTelefono?: string;
};

export type ApartadoPrefill = {
  unidadId: string;
  unidad: string;
  tipo: string;
  listaPrecios: string | null;
  precioLista: number | null;
  prospectoId: string | null;
  cotizacionId: string | null;
  clienteNombre: string;
  origenCiudad: string | null;
  medioPublicitario: string | null;
  equipoVenta: string | null;
  promotorNombre: string | null;
  tipoInversion: string | null;
  esquemaPago: string | null;
  descuentoPct: number | null;
  precioVenta: number | null;
  prospectoEmail: string | null;
  prospectoTelefono: string | null;
  cotizacionReciente: boolean;
};

export type ApartadoAsesorOption = {
  id: string;
  nombre: string;
};

export type ApartadoContextFromProspecto = {
  desarrolloId: string;
  prefill: ApartadoPrefill;
  unidades: SembradoUnidadRow[];
  asesores: ApartadoAsesorOption[];
  segmentos: DesarrolloSembradoSegment[];
};

export const mergeProspectoIntoPrefill = (
  prefill: ApartadoPrefill,
  prospecto: NonNullable<Awaited<ReturnType<typeof getProspectoById>>>,
  cotizacionId: string | null,
): ApartadoPrefill => ({
  ...prefill,
  prospectoId: prospecto.id,
  cotizacionId,
  clienteNombre: prospecto.nombre.trim(),
  origenCiudad: prospecto.origen_ciudad ?? prefill.origenCiudad,
  medioPublicitario: resolveMedioPublicitarioFromProspecto(prospecto) || prefill.medioPublicitario,
  equipoVenta: prospecto.equipo_venta ?? prefill.equipoVenta,
  promotorNombre: prospecto.promotor_nombre ?? prefill.promotorNombre,
  tipoInversion: prospecto.tipo_inversion ?? prefill.tipoInversion,
  prospectoEmail: prospecto.email ?? prefill.prospectoEmail,
  prospectoTelefono: prospecto.telefono ?? prefill.prospectoTelefono,
  cotizacionReciente: Boolean(cotizacionId),
});

export const getApartadoContextFromProspecto = async (
  prospectoId: string,
  profile?: AdminProfile,
): Promise<ApartadoContextFromProspecto> => {
  const prospecto = await getProspectoById(prospectoId, profile);
  if (!prospecto) {
    throw new Error("Prospecto no encontrado.");
  }

  if (profile && !canAccessDesarrollo(profile, prospecto.desarrollo_id)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  if (prospecto.etapa === "vendido" || prospecto.etapa === "perdido") {
    throw new Error("Este prospecto ya está cerrado (vendido o descartado).");
  }

  const cotizacion = prospecto.cotizaciones[0] ?? null;

  let prefill: ApartadoPrefill;

  if (cotizacion?.unidad_id) {
    prefill = await getApartadoPrefill(
      prospecto.desarrollo_id,
      cotizacion.unidad_id,
      profile,
    );
    prefill = mergeProspectoIntoPrefill(prefill, prospecto, cotizacion.id);
  } else {
    prefill = {
      unidadId: "",
      unidad: cotizacion?.unidad_numero ?? "",
      tipo: cotizacion?.tipo_unidad ?? "",
      listaPrecios: null,
      precioLista:
        cotizacion?.precio_lista != null ? Number(cotizacion.precio_lista) : null,
      prospectoId: prospecto.id,
      cotizacionId: cotizacion?.id ?? null,
      clienteNombre: prospecto.nombre.trim(),
      origenCiudad: prospecto.origen_ciudad ?? null,
      medioPublicitario: resolveMedioPublicitarioFromProspecto(prospecto),
      equipoVenta: prospecto.equipo_venta ?? null,
      promotorNombre: prospecto.promotor_nombre ?? null,
      tipoInversion: prospecto.tipo_inversion ?? null,
      esquemaPago: cotizacion?.esquema_pago ?? null,
      descuentoPct:
        cotizacion?.descuento_pct != null ? Number(cotizacion.descuento_pct) : null,
      precioVenta:
        cotizacion?.precio_total != null ? Number(cotizacion.precio_total) : null,
      prospectoEmail: prospecto.email ?? null,
      prospectoTelefono: prospecto.telefono ?? null,
      cotizacionReciente: Boolean(cotizacion),
    };
  }

  const filas = await listSembradoUnidades(
    { desarrolloId: prospecto.desarrollo_id },
    profile,
  );

  const unidades = filas.filter((row) => {
    if (row.operacion) {
      return false;
    }
    if (row.estatusInventario === "disponible" || row.estatusInventario === "apartado") {
      return true;
    }
    return cotizacion?.unidad_id != null && row.unidadId === cotizacion.unidad_id;
  });

  if (cotizacion?.unidad_id && !unidades.some((row) => row.unidadId === cotizacion.unidad_id)) {
    const quoted = filas.find((row) => row.unidadId === cotizacion.unidad_id);
    if (quoted && !quoted.operacion) {
      unidades.unshift(quoted);
    }
  }

  return {
    desarrolloId: prospecto.desarrollo_id,
    prefill,
    unidades,
    asesores: (await listAsesores({ desarrolloId: prospecto.desarrollo_id })).map((row) => ({
      id: row.id,
      nombre: row.nombre,
    })),
    segmentos: getSembradoSegmentsForDesarrollo(prospecto.desarrollo_id),
  };
};

const syncProspectoEtapaFromOperacion = async (
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>,
  params: {
    prospectoId: string | null;
    estatusSembrado: string;
    cancelada?: boolean;
  },
) => {
  if (!params.prospectoId) {
    return;
  }

  const nextEtapa = prospectoEtapaFromSembrado(
    params.estatusSembrado,
    Boolean(params.cancelada),
  );
  if (!nextEtapa) {
    return;
  }

  const { data: prospecto } = await supabase
    .from("prospectos")
    .select("etapa")
    .eq("id", params.prospectoId)
    .eq("activo", true)
    .maybeSingle();

  if (!prospecto) {
    return;
  }

  if (prospecto.etapa === "perdido" && !params.cancelada) {
    return;
  }

  if (prospecto.etapa === nextEtapa) {
    return;
  }

  await supabase
    .from("prospectos")
    .update({
      etapa: nextEtapa,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.prospectoId);
};

export const getApartadoPrefill = async (
  desarrolloId: string,
  unidadId: string,
  profile?: AdminProfile,
): Promise<ApartadoPrefill> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  if (profile && !canAccessDesarrollo(profile, desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const { data: unit, error: unitError } = await supabase
    .from("disponibilidad_unidades")
    .select("*")
    .eq("id", unidadId)
    .eq("desarrollo_id", desarrolloId)
    .maybeSingle();

  if (unitError) {
    throw new Error(unitError.message);
  }
  if (!unit) {
    throw new Error("Unidad no encontrada.");
  }

  const { data: activeOp } = await supabase
    .from("operaciones_comerciales")
    .select("id")
    .eq("unidad_id", unidadId)
    .eq("cancelada", false)
    .maybeSingle();

  if (activeOp) {
    throw new Error("Esta unidad ya tiene una operación activa.");
  }

  const { data: cotizaciones } = await supabase
    .from("cotizaciones")
    .select("*")
    .eq("desarrollo_id", desarrolloId)
    .eq("unidad_id", unidadId)
    .order("created_at", { ascending: false })
    .limit(1);

  const cotizacion = cotizaciones?.[0] ?? null;
  let prospecto = null;

  if (cotizacion?.prospecto_id) {
    const { data } = await supabase
      .from("prospectos")
      .select("*")
      .eq("id", cotizacion.prospecto_id)
      .maybeSingle();
    prospecto = data;
  }

  if (!prospecto && cotizacion?.cliente_nombre) {
    const { data } = await supabase
      .from("prospectos")
      .select("*")
      .eq("desarrollo_id", desarrolloId)
      .eq("nombre", cotizacion.cliente_nombre)
      .eq("activo", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    prospecto = data;
  }

  const precioLista =
    cotizacion?.precio_lista != null
      ? Number(cotizacion.precio_lista)
      : unit.precio != null
        ? Number(unit.precio)
        : null;

  const precioVenta =
    cotizacion?.precio_total != null ? Number(cotizacion.precio_total) : precioLista;

  return {
    unidadId: unit.id,
    unidad: unit.unidad,
    tipo: unit.tipo,
    listaPrecios: unit.lista_precios ?? null,
    precioLista,
    prospectoId: prospecto?.id ?? cotizacion?.prospecto_id ?? null,
    cotizacionId: cotizacion?.id ?? null,
    clienteNombre:
      cotizacion?.cliente_nombre?.trim() ||
      prospecto?.nombre?.trim() ||
      "",
    origenCiudad: prospecto?.origen_ciudad ?? null,
    medioPublicitario: resolveMedioPublicitarioFromProspecto({
      medio_publicitario: prospecto?.medio_publicitario,
      medio_contacto: prospecto?.medio_contacto,
    }) || null,
    equipoVenta: prospecto?.equipo_venta ?? null,
    promotorNombre: prospecto?.promotor_nombre ?? null,
    tipoInversion: prospecto?.tipo_inversion ?? null,
    esquemaPago: cotizacion?.esquema_pago ?? null,
    descuentoPct:
      cotizacion?.descuento_pct != null ? Number(cotizacion.descuento_pct) : null,
    precioVenta,
    prospectoEmail: prospecto?.email ?? null,
    prospectoTelefono: prospecto?.telefono ?? null,
    cotizacionReciente: Boolean(cotizacion),
  };
};

export const createOperacionApartado = async (
  input: CreateApartadoInput,
  profile?: AdminProfile,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  if (profile && !canAccessDesarrollo(profile, input.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const clienteNombre = input.clienteNombre.trim();
  if (!clienteNombre) {
    throw new Error("El nombre del cliente es obligatorio.");
  }

  const estatusSembrado = input.estatusSembrado?.trim() || "Apartado";

  const { data: unit, error: unitError } = await supabase
    .from("disponibilidad_unidades")
    .select("id, unidad, estatus, desarrollo_id")
    .eq("id", input.unidadId)
    .eq("desarrollo_id", input.desarrolloId)
    .maybeSingle();

  if (unitError) {
    throw new Error(unitError.message);
  }
  if (!unit) {
    throw new Error("Unidad no encontrada.");
  }

  if (unit.estatus === "vendido" || unit.estatus === "bloqueado") {
    throw new Error("Esta unidad no está disponible para apartado.");
  }

  const { data: activeOp } = await supabase
    .from("operaciones_comerciales")
    .select("id")
    .eq("unidad_id", input.unidadId)
    .eq("cancelada", false)
    .maybeSingle();

  if (activeOp) {
    throw new Error("Esta unidad ya tiene una operación activa.");
  }

  let prospectoId = input.prospectoId ?? null;

  if (!prospectoId) {
    const { data: createdProspecto, error: prospectoError } = await supabase
      .from("prospectos")
      .insert({
        desarrollo_id: input.desarrolloId,
        nombre: clienteNombre,
        email: input.prospectoEmail?.trim() || null,
        telefono: input.prospectoTelefono?.trim() || null,
        origen_ciudad: input.origenCiudad?.trim() || null,
        medio_publicitario: input.medioPublicitario?.trim() || null,
        equipo_venta: input.equipoVenta?.trim() || null,
        promotor_nombre: input.promotorNombre?.trim() || null,
        tipo_inversion: input.tipoInversion ?? null,
        etapa: "apartado",
      })
      .select("id")
      .single();

    if (prospectoError) {
      throw new Error(prospectoError.message);
    }
    prospectoId = createdProspecto.id;
  } else {
    await supabase
      .from("prospectos")
      .update({
        nombre: clienteNombre,
        email: input.prospectoEmail?.trim() || null,
        telefono: input.prospectoTelefono?.trim() || null,
        origen_ciudad: input.origenCiudad?.trim() || null,
        medio_publicitario: input.medioPublicitario?.trim() || null,
        medio_contacto: input.medioPublicitario?.trim() || null,
        equipo_venta: input.equipoVenta?.trim() || null,
        promotor_nombre: input.promotorNombre?.trim() || null,
        tipo_inversion: input.tipoInversion ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prospectoId);
  }

  const precioVenta = input.precioVenta ?? input.precioLista ?? null;
  const fechaApartado = input.fechaApartado || new Date().toISOString().slice(0, 10);

  const { data: operacion, error: opError } = await supabase
    .from("operaciones_comerciales")
    .insert({
      desarrollo_id: input.desarrolloId,
      unidad_id: input.unidadId,
      prospecto_id: prospectoId,
      cotizacion_id: input.cotizacionId ?? null,
      estatus_sembrado: estatusSembrado,
      cliente_nombre: clienteNombre,
      origen_ciudad: input.origenCiudad?.trim() || null,
      equipo_venta: input.equipoVenta?.trim() || null,
      promotor_nombre: input.promotorNombre?.trim() || null,
      tipo_inversion: input.tipoInversion ?? null,
      lista_precios: input.listaPrecios?.trim() || null,
      precio_lista: input.precioLista ?? null,
      descuento_pct: input.descuentoPct ?? null,
      precio_venta: precioVenta,
      esquema_pago: input.esquemaPago?.trim() || null,
      fecha_apartado: fechaApartado,
      fecha_cierre: input.fechaCierre?.trim() || null,
      medio_publicitario: input.medioPublicitario?.trim() || null,
      observaciones_pagos: input.observacionesPagos?.trim() || null,
      observaciones: input.observaciones?.trim() || null,
    })
    .select("*")
    .single();

  if (opError) {
    throw new Error(opError.message);
  }

  await syncProspectoEtapaFromOperacion(supabase, {
    prospectoId,
    estatusSembrado,
    cancelada: false,
  });

  let totalCobrado = 0;
  if (input.primerPago != null && input.primerPago > 0) {
    const mes = new Date(fechaApartado);
    const mesDate = new Date(mes.getFullYear(), mes.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const { error: cobranzaError } = await supabase.from("cobranza_mensual").insert({
      operacion_id: operacion.id,
      mes: mesDate,
      monto: input.primerPago,
    });

    if (cobranzaError) {
      throw new Error(cobranzaError.message);
    }
    totalCobrado = input.primerPago;
  }

  const comprobacion =
    precioVenta != null ? totalCobrado - precioVenta : totalCobrado || null;

  await supabase
    .from("operaciones_comerciales")
    .update({
      comprobacion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", operacion.id);

  const inventarioEstatus = sembradoToInventarioEstatus(estatusSembrado);

  const { error: invError } = await supabase
    .from("disponibilidad_unidades")
    .update({
      estatus: inventarioEstatus,
      lista_precios: input.listaPrecios?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.unidadId);

  if (invError) {
    throw new Error(invError.message);
  }

  if (prospectoId) {
    await markSolicitudApartadoAtendida(prospectoId, profile?.id ?? null);
  }

  return {
    ...(operacion as OperacionComercialRecord),
    comprobacion,
  };
};

export type CobranzaMensualRecord = {
  id: string;
  operacion_id: string;
  mes: string;
  monto: number;
  created_at: string;
};

export type OperacionDetail = {
  operacion: OperacionComercialRecord;
  unidad: string;
  cobranza: CobranzaMensualRecord[];
  totalCobrado: number;
};

export type UpdateOperacionInput = {
  estatusSembrado?: string;
  clienteNombre?: string;
  origenCiudad?: string;
  equipoVenta?: string;
  promotorNombre?: string;
  tipoInversion?: string | null;
  listaPrecios?: string;
  precioLista?: number | null;
  descuentoPct?: number | null;
  precioVenta?: number | null;
  esquemaPago?: string;
  fechaApartado?: string | null;
  medioPublicitario?: string;
  observacionesPagos?: string;
  observaciones?: string;
  personaMoral?: boolean;
  cobranza?: Array<{ mes: string; monto: number }>;
};

const recalcComprobacion = (totalCobrado: number, precioVenta: number | null) =>
  precioVenta != null ? totalCobrado - precioVenta : totalCobrado || null;

export const getOperacionDetail = async (
  operacionId: string,
  profile?: AdminProfile,
): Promise<OperacionDetail | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data: operacion, error } = await supabase
    .from("operaciones_comerciales")
    .select("*")
    .eq("id", operacionId)
    .eq("cancelada", false)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!operacion) {
    return null;
  }

  if (profile && !canAccessDesarrollo(profile, operacion.desarrollo_id)) {
    throw new Error("No tienes permiso para esta operación.");
  }

  const [{ data: unidad }, { data: cobranza, error: cobranzaError }] = await Promise.all([
    supabase
      .from("disponibilidad_unidades")
      .select("unidad")
      .eq("id", operacion.unidad_id)
      .maybeSingle(),
    supabase
      .from("cobranza_mensual")
      .select("*")
      .eq("operacion_id", operacionId)
      .order("mes", { ascending: true }),
  ]);

  if (cobranzaError) {
    throw new Error(cobranzaError.message);
  }

  const rows = (cobranza ?? []) as CobranzaMensualRecord[];
  const totalCobrado = rows.reduce((sum, row) => sum + Number(row.monto ?? 0), 0);

  return {
    operacion: operacion as OperacionComercialRecord,
    unidad: unidad?.unidad ?? "—",
    cobranza: rows,
    totalCobrado,
  };
};

export const updateOperacionComercial = async (
  operacionId: string,
  input: UpdateOperacionInput,
  profile?: AdminProfile,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const existing = await getOperacionDetail(operacionId, profile);
  if (!existing) {
    throw new Error("Operación no encontrada.");
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.estatusSembrado !== undefined) {
    patch.estatus_sembrado = input.estatusSembrado.trim();
  }
  if (input.clienteNombre !== undefined) {
    const nombre = input.clienteNombre.trim();
    if (!nombre) {
      throw new Error("El nombre del cliente es obligatorio.");
    }
    patch.cliente_nombre = nombre;
  }
  if (input.origenCiudad !== undefined) {
    patch.origen_ciudad = input.origenCiudad.trim() || null;
  }
  if (input.equipoVenta !== undefined) {
    patch.equipo_venta = input.equipoVenta.trim() || null;
  }
  if (input.promotorNombre !== undefined) {
    patch.promotor_nombre = input.promotorNombre.trim() || null;
  }
  if (input.tipoInversion !== undefined) {
    patch.tipo_inversion = input.tipoInversion;
  }
  if (input.listaPrecios !== undefined) {
    patch.lista_precios = input.listaPrecios.trim() || null;
  }
  if (input.precioLista !== undefined) {
    patch.precio_lista = input.precioLista;
  }
  if (input.descuentoPct !== undefined) {
    patch.descuento_pct = input.descuentoPct;
  }
  if (input.precioVenta !== undefined) {
    patch.precio_venta = input.precioVenta;
  }
  if (input.esquemaPago !== undefined) {
    patch.esquema_pago = input.esquemaPago.trim() || null;
  }
  if (input.fechaApartado !== undefined) {
    patch.fecha_apartado = input.fechaApartado;
  }
  if (input.medioPublicitario !== undefined) {
    patch.medio_publicitario = input.medioPublicitario.trim() || null;
  }
  if (input.observacionesPagos !== undefined) {
    patch.observaciones_pagos = input.observacionesPagos.trim() || null;
  }
  if (input.observaciones !== undefined) {
    patch.observaciones = input.observaciones.trim() || null;
  }
  if (input.personaMoral !== undefined) {
    patch.persona_moral = input.personaMoral;
  }

  const { error: updateError } = await supabase
    .from("operaciones_comerciales")
    .update(patch)
    .eq("id", operacionId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (input.cobranza) {
    for (const row of input.cobranza) {
      const mes = row.mes.slice(0, 10);
      const monto = Number(row.monto ?? 0);

      if (monto > 0) {
        const { error: upsertError } = await supabase.from("cobranza_mensual").upsert(
          {
            operacion_id: operacionId,
            mes,
            monto,
          },
          { onConflict: "operacion_id,mes" },
        );

        if (upsertError) {
          throw new Error(upsertError.message);
        }
      } else {
        const { error: deleteError } = await supabase
          .from("cobranza_mensual")
          .delete()
          .eq("operacion_id", operacionId)
          .eq("mes", mes);

        if (deleteError) {
          throw new Error(deleteError.message);
        }
      }
    }
  }

  const updatedDetail = await getOperacionDetail(operacionId, profile);
  if (!updatedDetail) {
    throw new Error("No se pudo recargar la operación.");
  }

  const precioVenta =
    input.precioVenta !== undefined
      ? input.precioVenta
      : updatedDetail.operacion.precio_venta;

  const comprobacion = recalcComprobacion(updatedDetail.totalCobrado, precioVenta);

  await supabase
    .from("operaciones_comerciales")
    .update({
      comprobacion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", operacionId);

  const estatusSembrado =
    input.estatusSembrado?.trim() ?? updatedDetail.operacion.estatus_sembrado;

  if (input.estatusSembrado !== undefined) {
    const inventarioEstatus = sembradoToInventarioEstatus(estatusSembrado);
    await supabase
      .from("disponibilidad_unidades")
      .update({
        estatus: inventarioEstatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updatedDetail.operacion.unidad_id);

    await syncProspectoEtapaFromOperacion(supabase, {
      prospectoId: updatedDetail.operacion.prospecto_id,
      estatusSembrado,
      cancelada: updatedDetail.operacion.cancelada,
    });
  }

  return {
    ...updatedDetail,
    operacion: {
      ...updatedDetail.operacion,
      ...patch,
      comprobacion,
    } as OperacionComercialRecord,
  };
};

const ESTATUS_NO_CANCELABLES = new Set(["Vendidas Cobradas"]);

export type CancelOperacionInput = {
  motivo?: string;
  /** Etapa CRM del prospecto tras cancelar (default: cita para reactivar seguimiento). */
  prospectoEtapa?: "cita" | "perdido";
};

export const cancelOperacionComercial = async (
  operacionId: string,
  input: CancelOperacionInput = {},
  profile?: AdminProfile,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: operacion, error: fetchError } = await supabase
    .from("operaciones_comerciales")
    .select("*")
    .eq("id", operacionId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!operacion) {
    throw new Error("Operación no encontrada.");
  }

  if (profile && !canAccessDesarrollo(profile, operacion.desarrollo_id)) {
    throw new Error("No tienes permiso para esta operación.");
  }

  if (operacion.cancelada) {
    throw new Error("Esta operación ya está cancelada.");
  }

  if (ESTATUS_NO_CANCELABLES.has(operacion.estatus_sembrado)) {
    throw new Error("No se puede cancelar una venta cerrada y cobrada.");
  }

  const canceladaAt = new Date().toISOString();
  const fecha = canceladaAt.slice(0, 10);
  const motivo = input.motivo?.trim();
  const notaCancelacion = motivo
    ? `[Cancelado ${fecha}] ${motivo}`
    : `[Cancelado ${fecha}]`;
  const observaciones = operacion.observaciones?.trim()
    ? `${operacion.observaciones.trim()}\n${notaCancelacion}`
    : notaCancelacion;

  const { error: updateError } = await supabase
    .from("operaciones_comerciales")
    .update({
      cancelada: true,
      cancelada_at: canceladaAt,
      observaciones,
      updated_at: canceladaAt,
    })
    .eq("id", operacionId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: unidadError } = await supabase
    .from("disponibilidad_unidades")
    .update({
      estatus: "disponible",
      updated_at: canceladaAt,
    })
    .eq("id", operacion.unidad_id);

  if (unidadError) {
    throw new Error(unidadError.message);
  }

  if (operacion.prospecto_id) {
    const nextEtapa = input.prospectoEtapa ?? "cita";
    await supabase
      .from("prospectos")
      .update({
        etapa: nextEtapa,
        updated_at: canceladaAt,
      })
      .eq("id", operacion.prospecto_id);
  }

  return {
    ...(operacion as OperacionComercialRecord),
    cancelada: true,
    cancelada_at: canceladaAt,
    observaciones,
  };
};

export const updateUnidadCuracion = async (
  unidadId: string,
  input: UnidadCuracionInput,
  profile: AdminProfile,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("disponibilidad_unidades")
    .select("*")
    .eq("id", unidadId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!existing) {
    throw new Error("Unidad no encontrada.");
  }

  const unit = existing as ProductoRecomendadoRecord;
  if (!canAccessDesarrollo(profile, unit.desarrollo_id)) {
    throw new Error("No tienes permiso para esta unidad.");
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.precio !== undefined) patch.precio = input.precio;
  if (input.prototipoId !== undefined) patch.prototipo_id = input.prototipoId;
  if (input.etapa !== undefined) patch.etapa = input.etapa?.trim() || null;
  if (input.orden !== undefined) patch.orden = input.orden;
  if (input.visitable !== undefined) patch.visitable = input.visitable;
  if (input.prioridadComercial !== undefined) {
    patch.prioridad_comercial = input.prioridadComercial;
  }
  if (input.razonesVenta !== undefined) patch.razones_venta = input.razonesVenta;
  if (input.ubicacionComercial !== undefined) {
    patch.ubicacion_comercial = input.ubicacionComercial?.trim() || null;
  }
  if (input.instruccionRecorrido !== undefined) {
    patch.instruccion_recorrido = input.instruccionRecorrido?.trim() || null;
  }
  if (input.notaAcceso !== undefined) patch.nota_acceso = input.notaAcceso?.trim() || null;

  if (input.superficieTerrenoM2 !== undefined || input.superficieConstruccionM2 !== undefined) {
    const tipo = unit.tipo;
    const terreno =
      input.superficieTerrenoM2 !== undefined
        ? input.superficieTerrenoM2
        : unit.superficie_terreno_m2;
    const construccion =
      input.superficieConstruccionM2 !== undefined
        ? input.superficieConstruccionM2
        : unit.superficie_construccion_m2;
    Object.assign(patch, syncSuperficieLegacyFields(tipo, terreno, construccion));
  }

  const { data, error } = await supabase
    .from("disponibilidad_unidades")
    .update(patch)
    .eq("id", unidadId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductoRecomendadoRecord;
};
