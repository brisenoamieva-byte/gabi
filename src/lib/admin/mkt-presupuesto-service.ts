import { canAccessDesarrollo } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import {
  computeCostoUnitario,
  computeMktPctEjercido,
  computeMktRemanente,
  isMktGastoEstatus,
  isMktPartidaTipo,
  type MktEficienciaPeriodo,
  type MktGastoEstatus,
  type MktGastoRecord,
  type MktPartidaRecord,
  type MktPartidaTipo,
  type MktPresupuestoRecord,
  type MktPresupuestoResumen,
} from "@/lib/comercial/mkt-presupuesto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const mapPresupuesto = (row: Record<string, unknown>): MktPresupuestoRecord => ({
  id: String(row.id),
  desarrollo_id: String(row.desarrollo_id),
  anio: toNumber(row.anio),
  monto_autorizado: toNumber(row.monto_autorizado),
  moneda: String(row.moneda ?? "MXN"),
  notas: (row.notas as string | null) ?? null,
  activo: Boolean(row.activo),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

const mapPartida = (row: Record<string, unknown>): MktPartidaRecord => ({
  id: String(row.id),
  presupuesto_id: String(row.presupuesto_id),
  desarrollo_id: String(row.desarrollo_id),
  segmento: String(row.segmento),
  proveedor: (row.proveedor as string | null) ?? null,
  concepto: String(row.concepto),
  tipo: (isMktPartidaTipo(String(row.tipo)) ? String(row.tipo) : "variable") as MktPartidaTipo,
  cantidad: toNumber(row.cantidad),
  monto_autorizado: toNumber(row.monto_autorizado),
  orden: toNumber(row.orden),
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

const mapGasto = (row: Record<string, unknown>): MktGastoRecord => ({
  id: String(row.id),
  desarrollo_id: String(row.desarrollo_id),
  presupuesto_id: (row.presupuesto_id as string | null) ?? null,
  partida_id: (row.partida_id as string | null) ?? null,
  campana_id: (row.campana_id as string | null) ?? null,
  fecha_registro: String(row.fecha_registro).slice(0, 10),
  fecha_factura: row.fecha_factura ? String(row.fecha_factura).slice(0, 10) : null,
  fecha_pago: row.fecha_pago ? String(row.fecha_pago).slice(0, 10) : null,
  proveedor: String(row.proveedor),
  descripcion: String(row.descripcion),
  factura_ref: (row.factura_ref as string | null) ?? null,
  monto_sin_iva: toNumber(row.monto_sin_iva),
  iva: toNumber(row.iva),
  total: toNumber(row.total),
  estatus: (isMktGastoEstatus(String(row.estatus)) ? String(row.estatus) : "pendiente") as MktGastoEstatus,
  observaciones: (row.observaciones as string | null) ?? null,
  created_at: String(row.created_at),
  updated_at: String(row.updated_at),
});

const assertAccess = (profile: AdminProfile | undefined, desarrolloId: string) => {
  if (profile && !canAccessDesarrollo(profile, desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }
};

export type UpsertPresupuestoInput = {
  desarrolloId: string;
  anio: number;
  montoAutorizado: number;
  notas?: string | null;
  activo?: boolean;
};

export type PartidaInput = {
  segmento: string;
  proveedor?: string | null;
  concepto: string;
  tipo?: MktPartidaTipo;
  cantidad?: number;
  montoAutorizado?: number;
  orden?: number;
};

export type GastoInput = {
  desarrolloId: string;
  presupuestoId?: string | null;
  partidaId?: string | null;
  campanaId?: string | null;
  fechaRegistro: string;
  fechaFactura?: string | null;
  fechaPago?: string | null;
  proveedor: string;
  descripcion: string;
  facturaRef?: string | null;
  montoSinIva: number;
  iva?: number;
  total?: number;
  estatus?: MktGastoEstatus;
  observaciones?: string | null;
};

export const getOrCreatePresupuesto = async (
  desarrolloId: string,
  anio: number,
  profile?: AdminProfile,
): Promise<MktPresupuestoRecord> => {
  assertAccess(profile, desarrolloId);
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: existing, error: findError } = await supabase
    .from("desarrollo_mkt_presupuesto")
    .select("*")
    .eq("desarrollo_id", desarrolloId)
    .eq("anio", anio)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }
  if (existing) {
    return mapPresupuesto(existing as Record<string, unknown>);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("desarrollo_mkt_presupuesto")
    .insert({
      desarrollo_id: desarrolloId,
      anio,
      monto_autorizado: 0,
      moneda: "MXN",
      activo: true,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear el presupuesto.");
  }
  return mapPresupuesto(data as Record<string, unknown>);
};

export const upsertPresupuesto = async (
  input: UpsertPresupuestoInput,
  profile?: AdminProfile,
): Promise<MktPresupuestoRecord> => {
  assertAccess(profile, input.desarrolloId);
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("desarrollo_mkt_presupuesto")
    .upsert(
      {
        desarrollo_id: input.desarrolloId,
        anio: input.anio,
        monto_autorizado: Math.max(0, input.montoAutorizado),
        notas: input.notas?.trim() || null,
        activo: input.activo ?? true,
        moneda: "MXN",
        updated_at: now,
      },
      { onConflict: "desarrollo_id,anio" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo guardar el presupuesto.");
  }
  return mapPresupuesto(data as Record<string, unknown>);
};

export const listPartidas = async (
  presupuestoId: string,
  profile?: AdminProfile,
): Promise<MktPartidaRecord[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("desarrollo_mkt_partida")
    .select("*")
    .eq("presupuesto_id", presupuestoId)
    .order("orden", { ascending: true })
    .order("concepto", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((row) => mapPartida(row as Record<string, unknown>));
  if (profile && rows[0]) {
    assertAccess(profile, rows[0].desarrollo_id);
  }
  return rows;
};

export const createPartida = async (
  presupuestoId: string,
  input: PartidaInput,
  profile?: AdminProfile,
): Promise<MktPartidaRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: presupuesto, error: presupuestoError } = await supabase
    .from("desarrollo_mkt_presupuesto")
    .select("id, desarrollo_id")
    .eq("id", presupuestoId)
    .maybeSingle();

  if (presupuestoError || !presupuesto) {
    throw new Error("Presupuesto no encontrado.");
  }
  assertAccess(profile, String(presupuesto.desarrollo_id));

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("desarrollo_mkt_partida")
    .insert({
      presupuesto_id: presupuestoId,
      desarrollo_id: presupuesto.desarrollo_id,
      segmento: input.segmento.trim(),
      proveedor: input.proveedor?.trim() || null,
      concepto: input.concepto.trim(),
      tipo: input.tipo ?? "variable",
      cantidad: input.cantidad ?? 1,
      monto_autorizado: Math.max(0, input.montoAutorizado ?? 0),
      orden: input.orden ?? 0,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la partida.");
  }
  return mapPartida(data as Record<string, unknown>);
};

export const updatePartida = async (
  partidaId: string,
  input: Partial<PartidaInput>,
  profile?: AdminProfile,
): Promise<MktPartidaRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: existing, error: findError } = await supabase
    .from("desarrollo_mkt_partida")
    .select("*")
    .eq("id", partidaId)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error("Partida no encontrada.");
  }
  assertAccess(profile, String(existing.desarrollo_id));

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.segmento !== undefined) patch.segmento = input.segmento.trim();
  if (input.proveedor !== undefined) patch.proveedor = input.proveedor?.trim() || null;
  if (input.concepto !== undefined) patch.concepto = input.concepto.trim();
  if (input.tipo !== undefined) patch.tipo = input.tipo;
  if (input.cantidad !== undefined) patch.cantidad = input.cantidad;
  if (input.montoAutorizado !== undefined) patch.monto_autorizado = Math.max(0, input.montoAutorizado);
  if (input.orden !== undefined) patch.orden = input.orden;

  const { data, error } = await supabase
    .from("desarrollo_mkt_partida")
    .update(patch)
    .eq("id", partidaId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo actualizar la partida.");
  }
  return mapPartida(data as Record<string, unknown>);
};

export const deletePartida = async (partidaId: string, profile?: AdminProfile): Promise<void> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: existing, error: findError } = await supabase
    .from("desarrollo_mkt_partida")
    .select("id, desarrollo_id")
    .eq("id", partidaId)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error("Partida no encontrada.");
  }
  assertAccess(profile, String(existing.desarrollo_id));

  const { error } = await supabase.from("desarrollo_mkt_partida").delete().eq("id", partidaId);
  if (error) {
    throw new Error(error.message);
  }
};

export const listGastos = async (
  filters: {
    desarrolloId: string;
    presupuestoId?: string;
    desde?: string;
    hasta?: string;
    estatus?: MktGastoEstatus | "activos";
  },
  profile?: AdminProfile,
): Promise<MktGastoRecord[]> => {
  assertAccess(profile, filters.desarrolloId);
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  let query = supabase
    .from("desarrollo_mkt_gasto")
    .select("*")
    .eq("desarrollo_id", filters.desarrolloId)
    .order("fecha_registro", { ascending: false });

  if (filters.presupuestoId) {
    query = query.eq("presupuesto_id", filters.presupuestoId);
  }
  if (filters.desde) {
    query = query.gte("fecha_registro", filters.desde);
  }
  if (filters.hasta) {
    query = query.lte("fecha_registro", filters.hasta);
  }
  if (filters.estatus === "activos") {
    query = query.in("estatus", ["pendiente", "pagada"]);
  } else if (filters.estatus) {
    query = query.eq("estatus", filters.estatus);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapGasto(row as Record<string, unknown>));
};

const resolveGastoTotal = (input: GastoInput) => {
  if (input.total !== undefined && Number.isFinite(input.total)) {
    return Math.max(0, input.total);
  }
  return Math.max(0, input.montoSinIva) + Math.max(0, input.iva ?? 0);
};

export const createGasto = async (
  input: GastoInput,
  profile?: AdminProfile,
): Promise<MktGastoRecord> => {
  assertAccess(profile, input.desarrolloId);
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const proveedor = input.proveedor.trim();
  const descripcion = input.descripcion.trim();
  if (!proveedor || !descripcion) {
    throw new Error("Proveedor y descripción son obligatorios.");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("desarrollo_mkt_gasto")
    .insert({
      desarrollo_id: input.desarrolloId,
      presupuesto_id: input.presupuestoId ?? null,
      partida_id: input.partidaId ?? null,
      campana_id: input.campanaId ?? null,
      fecha_registro: input.fechaRegistro.slice(0, 10),
      fecha_factura: input.fechaFactura?.slice(0, 10) || null,
      fecha_pago: input.fechaPago?.slice(0, 10) || null,
      proveedor,
      descripcion,
      factura_ref: input.facturaRef?.trim() || null,
      monto_sin_iva: Math.max(0, input.montoSinIva),
      iva: Math.max(0, input.iva ?? 0),
      total: resolveGastoTotal(input),
      estatus: input.estatus ?? "pendiente",
      observaciones: input.observaciones?.trim() || null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo registrar el gasto.");
  }
  return mapGasto(data as Record<string, unknown>);
};

export const updateGasto = async (
  gastoId: string,
  input: Partial<GastoInput>,
  profile?: AdminProfile,
): Promise<MktGastoRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: existing, error: findError } = await supabase
    .from("desarrollo_mkt_gasto")
    .select("*")
    .eq("id", gastoId)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error("Gasto no encontrado.");
  }
  assertAccess(profile, String(existing.desarrollo_id));

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.presupuestoId !== undefined) patch.presupuesto_id = input.presupuestoId;
  if (input.partidaId !== undefined) patch.partida_id = input.partidaId;
  if (input.campanaId !== undefined) patch.campana_id = input.campanaId;
  if (input.fechaRegistro !== undefined) patch.fecha_registro = input.fechaRegistro.slice(0, 10);
  if (input.fechaFactura !== undefined) patch.fecha_factura = input.fechaFactura?.slice(0, 10) || null;
  if (input.fechaPago !== undefined) patch.fecha_pago = input.fechaPago?.slice(0, 10) || null;
  if (input.proveedor !== undefined) patch.proveedor = input.proveedor.trim();
  if (input.descripcion !== undefined) patch.descripcion = input.descripcion.trim();
  if (input.facturaRef !== undefined) patch.factura_ref = input.facturaRef?.trim() || null;
  if (input.montoSinIva !== undefined) patch.monto_sin_iva = Math.max(0, input.montoSinIva);
  if (input.iva !== undefined) patch.iva = Math.max(0, input.iva);
  if (input.total !== undefined) {
    patch.total = Math.max(0, input.total);
  } else if (input.montoSinIva !== undefined || input.iva !== undefined) {
    const monto = input.montoSinIva !== undefined ? input.montoSinIva : toNumber(existing.monto_sin_iva);
    const iva = input.iva !== undefined ? input.iva : toNumber(existing.iva);
    patch.total = Math.max(0, monto) + Math.max(0, iva);
  }
  if (input.estatus !== undefined) patch.estatus = input.estatus;
  if (input.observaciones !== undefined) patch.observaciones = input.observaciones?.trim() || null;

  const { data, error } = await supabase
    .from("desarrollo_mkt_gasto")
    .update(patch)
    .eq("id", gastoId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo actualizar el gasto.");
  }
  return mapGasto(data as Record<string, unknown>);
};

export const deleteGasto = async (gastoId: string, profile?: AdminProfile): Promise<void> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: existing, error: findError } = await supabase
    .from("desarrollo_mkt_gasto")
    .select("id, desarrollo_id")
    .eq("id", gastoId)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error("Gasto no encontrado.");
  }
  assertAccess(profile, String(existing.desarrollo_id));

  const { error } = await supabase.from("desarrollo_mkt_gasto").delete().eq("id", gastoId);
  if (error) {
    throw new Error(error.message);
  }
};

export const getPresupuestoResumen = async (
  desarrolloId: string,
  anio: number,
  profile?: AdminProfile,
): Promise<MktPresupuestoResumen> => {
  assertAccess(profile, desarrolloId);
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return {
      desarrolloId,
      anio,
      presupuestoId: null,
      autorizado: 0,
      erogado: 0,
      pendientePago: 0,
      pagado: 0,
      remanente: 0,
      pctEjercido: null,
      partidasCount: 0,
      gastosCount: 0,
    };
  }

  const { data: presupuesto } = await supabase
    .from("desarrollo_mkt_presupuesto")
    .select("*")
    .eq("desarrollo_id", desarrolloId)
    .eq("anio", anio)
    .maybeSingle();

  if (!presupuesto) {
    return {
      desarrolloId,
      anio,
      presupuestoId: null,
      autorizado: 0,
      erogado: 0,
      pendientePago: 0,
      pagado: 0,
      remanente: 0,
      pctEjercido: null,
      partidasCount: 0,
      gastosCount: 0,
    };
  }

  const presupuestoId = String(presupuesto.id);
  const autorizado = toNumber(presupuesto.monto_autorizado);

  const [{ count: partidasCount }, { data: gastos }] = await Promise.all([
    supabase
      .from("desarrollo_mkt_partida")
      .select("id", { count: "exact", head: true })
      .eq("presupuesto_id", presupuestoId),
    supabase
      .from("desarrollo_mkt_gasto")
      .select("total, estatus")
      .eq("desarrollo_id", desarrolloId)
      .eq("presupuesto_id", presupuestoId)
      .in("estatus", ["pendiente", "pagada"]),
  ]);

  let pendientePago = 0;
  let pagado = 0;
  for (const row of gastos ?? []) {
    const total = toNumber(row.total);
    if (row.estatus === "pagada") pagado += total;
    else pendientePago += total;
  }
  const erogado = pendientePago + pagado;

  return {
    desarrolloId,
    anio,
    presupuestoId,
    autorizado,
    erogado,
    pendientePago,
    pagado,
    remanente: computeMktRemanente(autorizado, erogado),
    pctEjercido: computeMktPctEjercido(autorizado, erogado),
    partidasCount: partidasCount ?? 0,
    gastosCount: gastos?.length ?? 0,
  };
};

export const getErogadoEnPeriodo = async (
  desarrolloId: string,
  desde: string,
  hasta: string,
  profile?: AdminProfile,
): Promise<number> => {
  const gastos = await listGastos(
    { desarrolloId, desde, hasta, estatus: "activos" },
    profile,
  );
  return gastos.reduce((sum, row) => sum + row.total, 0);
};

export const buildMktEficienciaPeriodo = async (
  desarrolloId: string,
  desde: string,
  hasta: string,
  apartadosPeriodo: number,
  ventasPeriodo: number,
  profile?: AdminProfile,
): Promise<MktEficienciaPeriodo> => {
  const erogado = await getErogadoEnPeriodo(desarrolloId, desde, hasta, profile);
  return {
    desarrolloId,
    desde,
    hasta,
    erogado,
    apartadosPeriodo,
    ventasPeriodo,
    costoPorApartado: computeCostoUnitario(erogado, apartadosPeriodo),
    costoPorVenta: computeCostoUnitario(erogado, ventasPeriodo),
  };
};

export const getPresupuestoBundle = async (
  desarrolloId: string,
  anio: number,
  profile?: AdminProfile,
) => {
  const resumen = await getPresupuestoResumen(desarrolloId, anio, profile);
  if (!resumen.presupuestoId) {
    return { resumen, presupuesto: null, partidas: [] as MktPartidaRecord[], gastos: [] as MktGastoRecord[] };
  }

  const presupuesto = await getOrCreatePresupuesto(desarrolloId, anio, profile);
  const [partidas, gastos] = await Promise.all([
    listPartidas(presupuesto.id, profile),
    listGastos({ desarrolloId, presupuestoId: presupuesto.id }, profile),
  ]);

  return { resumen, presupuesto, partidas, gastos };
};
