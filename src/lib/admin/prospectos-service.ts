import { canAccessDesarrollo, isSuperAdmin } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import { bootstrapCadenciaForProspecto } from "@/lib/comercial/cadencia-service";
import {
  isProspectoEtapa,
  mergeProspectoEtapa,
  mergeProspectoEtapaFromVisita,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";
import type { CotizacionRecord, ProspectoRecord } from "@/lib/comercial/sembrado-status";
import {
  computeIscore,
  computeSellerScore,
  pickDuplicateIds,
} from "@/lib/comercial/lead-scoring";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { validateAsesorForVisita } from "@/lib/visitas/service";
import type { VisitaTipo } from "@/lib/visitas/types";
import { normalizeProspectoTelefono } from "@/lib/comercial/prospecto-telefono";

export type ProspectoListRow = ProspectoRecord & {
  asesorNombre: string | null;
  campanaNombre: string | null;
  campanaCanal: string | null;
};

export type ProspectoDetail = ProspectoListRow & {
  cotizaciones: CotizacionRecord[];
};

export type ProspectosResumen = {
  total: number;
  porEtapa: Record<string, number>;
};

export type UpdateProspectoInput = {
  etapa?: string;
  notas?: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  origenCiudad?: string;
  medioContacto?: string;
  medioPublicitario?: string;
  asesorId?: string | null;
  promotorNombre?: string;
  equipoVenta?: string;
  tipoInversion?: string | null;
  campanaId?: string | null;
  calificacion?: string;
  nivelInteres?: string | null;
  iscore?: number | null;
  sellerScore?: number | null;
  asignadoPor?: string;
  esSpam?: boolean;
  esDuplicado?: boolean;
};

export type ProspectoInput = {
  desarrolloId: string;
  nombre: string;
  email?: string;
  telefono?: string;
  origenCiudad?: string;
  medioContacto?: string;
  medioPublicitario?: string;
  asesorId?: string;
  promotorNombre?: string;
  equipoVenta?: string;
  tipoInversion?: string;
  etapa?: ProspectoRecord["etapa"];
  notas?: string;
  visitaId?: string;
  campanaId?: string;
};

const mapProspectoRow = (row: Record<string, unknown>): ProspectoListRow => {
  const asesor = row.asesor as { nombre?: string } | null;
  const campana = row.campana as { nombre?: string; canal?: string } | null;
  const prospecto = { ...row } as ProspectoRecord & { asesor?: unknown; campana?: unknown };
  delete prospecto.asesor;
  delete prospecto.campana;
  return {
    ...prospecto,
    asesorNombre: asesor?.nombre ?? null,
    campanaNombre: campana?.nombre ?? null,
    campanaCanal: campana?.canal ?? null,
  };
};

const toRow = (input: ProspectoInput) => ({
  desarrollo_id: input.desarrolloId,
  nombre: input.nombre.trim(),
  email: input.email?.trim() || null,
  telefono: normalizeProspectoTelefono(input.telefono?.trim()) || null,
  origen_ciudad: input.origenCiudad?.trim() || null,
  medio_contacto: input.medioContacto?.trim() || null,
  medio_publicitario: input.medioPublicitario?.trim() || null,
  asesor_id: input.asesorId ?? null,
  promotor_nombre: input.promotorNombre?.trim() || null,
  equipo_venta: input.equipoVenta?.trim() || null,
  tipo_inversion: input.tipoInversion ?? null,
  etapa: input.etapa ?? "nuevo",
  notas: input.notas?.trim() || null,
  visita_id: input.visitaId ?? null,
  campana_id: input.campanaId ?? null,
  updated_at: new Date().toISOString(),
});

export const listProspectos = async (
  filters: {
    desarrolloId?: string;
    etapa?: string;
    asesorId?: string;
    search?: string;
    desde?: string;
    hasta?: string;
    campanaId?: string;
    fechaEn?: "created" | "updated";
    spam?: "exclude" | "only" | "include";
    duplicados?: "exclude" | "only" | "include";
    nivelInteres?: string;
  },
  profile?: AdminProfile,
): Promise<ProspectoListRow[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("prospectos")
    .select("*, asesor:asesores(nombre), campana:campanas(nombre, canal)")
    .eq("activo", true)
    .order("updated_at", { ascending: false });

  if (filters.desarrolloId) {
    if (profile && !canAccessDesarrollo(profile, filters.desarrolloId)) {
      throw new Error("No tienes permiso para este desarrollo.");
    }
    query = query.eq("desarrollo_id", filters.desarrolloId);
  } else if (profile && !isSuperAdmin(profile)) {
    if (!profile.desarrollosIds.length) {
      return [];
    }
    query = query.in("desarrollo_id", profile.desarrollosIds);
  }

  if (filters.etapa) {
    query = query.eq("etapa", filters.etapa);
  }

  if (filters.asesorId) {
    query = query.eq("asesor_id", filters.asesorId);
  }

  if (filters.campanaId) {
    query = query.eq("campana_id", filters.campanaId);
  }

  if (filters.spam === "only") {
    query = query.eq("es_spam", true);
  } else if (filters.spam !== "include") {
    query = query.eq("es_spam", false);
  }

  if (filters.duplicados === "only") {
    query = query.eq("es_duplicado", true);
  } else if (filters.duplicados !== "include") {
    query = query.eq("es_duplicado", false);
  }

  if (filters.nivelInteres) {
    query = query.eq("nivel_interes", filters.nivelInteres);
  }

  if (filters.desde) {
    const fechaColumn = filters.fechaEn === "updated" ? "updated_at" : "created_at";
    query = query.gte(fechaColumn, `${filters.desde}T00:00:00.000Z`);
  }

  if (filters.hasta) {
    const fechaColumn = filters.fechaEn === "updated" ? "updated_at" : "created_at";
    query = query.lte(fechaColumn, `${filters.hasta}T23:59:59.999Z`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  let rows = (data ?? []).map((row) => mapProspectoRow(row as Record<string, unknown>));

  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (row) =>
        row.nombre.toLowerCase().includes(term) ||
        row.email?.toLowerCase().includes(term) ||
        row.telefono?.includes(term),
    );
  }

  return rows;
};

export const getProspectosResumen = async (
  desarrolloId: string,
  profile?: AdminProfile,
  filters?: {
    asesorId?: string;
    search?: string;
    desde?: string;
    hasta?: string;
    campanaId?: string;
    fechaEn?: "created" | "updated";
    spam?: "exclude" | "only" | "include";
    duplicados?: "exclude" | "only" | "include";
    nivelInteres?: string;
  },
): Promise<ProspectosResumen> => {
  const prospectos = await listProspectos({ desarrolloId, ...filters }, profile);
  const porEtapa: Record<string, number> = {};

  for (const prospecto of prospectos) {
    porEtapa[prospecto.etapa] = (porEtapa[prospecto.etapa] ?? 0) + 1;
  }

  return {
    total: prospectos.length,
    porEtapa,
  };
};

export const getProspectoById = async (
  id: string,
  profile?: AdminProfile,
): Promise<ProspectoDetail | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("prospectos")
    .select("*, asesor:asesores(nombre), campana:campanas(nombre, canal)")
    .eq("id", id)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  if (profile && !canAccessDesarrollo(profile, data.desarrollo_id)) {
    throw new Error("No tienes permiso para este prospecto.");
  }

  const { data: cotizaciones, error: cotizacionesError } = await supabase
    .from("cotizaciones")
    .select("*")
    .eq("prospecto_id", id)
    .order("created_at", { ascending: false });

  if (cotizacionesError) {
    throw new Error(cotizacionesError.message);
  }

  const mapped = mapProspectoRow(data as Record<string, unknown>);

  return {
    ...mapped,
    cotizaciones: (cotizaciones ?? []) as CotizacionRecord[],
  };
};

export const updateProspecto = async (
  id: string,
  input: UpdateProspectoInput,
  profile?: AdminProfile,
): Promise<ProspectoDetail> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const existing = await getProspectoById(id, profile);
  if (!existing) {
    throw new Error("Prospecto no encontrado.");
  }

  if (input.etapa && !isProspectoEtapa(input.etapa)) {
    throw new Error("Etapa no válida.");
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.etapa !== undefined) {
    patch.etapa = input.etapa;
  }
  if (input.notas !== undefined) {
    patch.notas = input.notas.trim() || null;
  }
  if (input.nombre !== undefined) {
    const nombre = input.nombre.trim();
    if (!nombre) {
      throw new Error("El nombre es obligatorio.");
    }
    patch.nombre = nombre;
  }
  if (input.email !== undefined) {
    patch.email = input.email.trim() || null;
  }
  if (input.telefono !== undefined) {
    patch.telefono = normalizeProspectoTelefono(input.telefono.trim()) || null;
  }
  if (input.origenCiudad !== undefined) {
    patch.origen_ciudad = input.origenCiudad.trim() || null;
  }
  if (input.medioContacto !== undefined) {
    patch.medio_contacto = input.medioContacto.trim() || null;
  }
  if (input.medioPublicitario !== undefined) {
    patch.medio_publicitario = input.medioPublicitario.trim() || null;
  }
  if (input.asesorId !== undefined) {
    const nextAsesorId = input.asesorId;
    const currentAsesorId = existing.asesor_id ?? null;

    if (nextAsesorId !== currentAsesorId) {
      if (nextAsesorId) {
        const validation = await validateAsesorForVisita(nextAsesorId, existing.desarrollo_id);
        if (!validation.ok) {
          throw new Error(validation.reason);
        }
      }
      patch.asesor_id = nextAsesorId;
      patch.asignado_por = input.asignadoPor?.trim() || "manual-gerente";
    }
  }
  if (input.promotorNombre !== undefined) {
    patch.promotor_nombre = input.promotorNombre.trim() || null;
  }
  if (input.equipoVenta !== undefined) {
    patch.equipo_venta = input.equipoVenta.trim() || null;
  }
  if (input.tipoInversion !== undefined) {
    patch.tipo_inversion = input.tipoInversion;
  }
  if (input.campanaId !== undefined) {
    patch.campana_id = input.campanaId;
  }
  if (input.calificacion !== undefined) {
    patch.calificacion = input.calificacion.trim() || null;
    patch.es_spam = input.calificacion.trim().toLowerCase().startsWith("descartado");
  }
  if (input.nivelInteres !== undefined) {
    patch.nivel_interes = input.nivelInteres || null;
  }
  if (input.iscore !== undefined) {
    patch.iscore = input.iscore;
  }
  if (input.sellerScore !== undefined) {
    patch.seller_score = input.sellerScore;
  }
  if (input.asignadoPor !== undefined) {
    patch.asignado_por = input.asignadoPor.trim() || null;
  }
  if (input.esSpam !== undefined) {
    patch.es_spam = input.esSpam;
  }
  if (input.esDuplicado !== undefined) {
    patch.es_duplicado = input.esDuplicado;
  }

  if (input.calificacion !== undefined || input.etapa !== undefined || input.esDuplicado !== undefined || input.nivelInteres !== undefined) {
    const merged = { ...existing, ...patch } as ProspectoRecord;
    if (input.iscore === undefined) {
      patch.iscore = computeIscore(merged);
    }
    if (input.sellerScore === undefined) {
      patch.seller_score = computeSellerScore(merged);
    }
  }

  const { error } = await supabase.from("prospectos").update(patch).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  if (input.asesorId !== undefined && input.asesorId !== (existing.asesor_id ?? null)) {
    await syncCadenciaAsesorOnReassign(id, input.asesorId);
  }

  const updated = await getProspectoById(id, profile);
  if (!updated) {
    throw new Error("No se pudo cargar el prospecto actualizado.");
  }

  return updated;
};

const syncCadenciaAsesorOnReassign = async (
  prospectoId: string,
  asesorId: string | null,
): Promise<void> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  if (asesorId) {
    const { error } = await supabase
      .from("prospecto_cadencia")
      .update({ asesor_id: asesorId })
      .eq("prospecto_id", prospectoId)
      .eq("status", "active");

    if (error) {
      throw new Error(error.message);
    }
  }

  await bootstrapCadenciaForProspecto(prospectoId);
};

export const deactivateProspecto = async (
  id: string,
  profile?: AdminProfile,
): Promise<void> => {
  const deleted = await bulkDeactivateProspectos([id], profile);
  if (!deleted) {
    throw new Error("No se pudo eliminar el prospecto.");
  }
};

export const bulkReassignProspectos = async (
  ids: string[],
  asesorId: string,
  profile?: AdminProfile,
): Promise<number> => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) {
    return 0;
  }

  const trimmedAsesorId = asesorId.trim();
  if (!trimmedAsesorId) {
    throw new Error("Selecciona un asesor para reasignar.");
  }

  let reassigned = 0;

  for (const id of uniqueIds) {
    const existing = await getProspectoById(id, profile);
    if (!existing) {
      continue;
    }

    if (existing.asesor_id === trimmedAsesorId) {
      continue;
    }

    await updateProspecto(
      id,
      { asesorId: trimmedAsesorId, asignadoPor: "manual-gerente" },
      profile,
    );
    reassigned += 1;
  }

  return reassigned;
};

const normalizeEmail = (value?: string) => value?.trim().toLowerCase() || null;

export type ProspectoTelefonoMatch = {
  prospecto: ProspectoListRow;
  asesorNombre: string | null;
};

export const findProspectoByTelefonoInDesarrollo = async (
  desarrolloId: string,
  telefono: string,
): Promise<ProspectoTelefonoMatch | null> => {
  const phoneDigits = normalizeProspectoTelefono(telefono);
  if (!phoneDigits || phoneDigits.length !== 10) {
    return null;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data: candidates } = await supabase
    .from("prospectos")
    .select("*, asesor:asesores(nombre)")
    .eq("desarrollo_id", desarrolloId)
    .eq("activo", true)
    .not("telefono", "is", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  const match = (candidates ?? []).find(
    (row) => normalizeProspectoTelefono(row.telefono as string) === phoneDigits,
  );

  if (!match) {
    return null;
  }

  const mapped = mapProspectoRow(match as Record<string, unknown>);
  return {
    prospecto: mapped,
    asesorNombre: mapped.asesorNombre,
  };
};

export const findProspectoByContact = async (
  desarrolloId: string,
  email?: string,
  telefono?: string,
): Promise<ProspectoRecord | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) {
    const { data } = await supabase
      .from("prospectos")
      .select("*")
      .eq("desarrollo_id", desarrolloId)
      .eq("email", normalizedEmail)
      .eq("activo", true)
      .maybeSingle();

    if (data) {
      return data as ProspectoRecord;
    }
  }

  const phoneDigits = normalizeProspectoTelefono(telefono);
  if (phoneDigits && phoneDigits.length === 10) {
    const match = await findProspectoByTelefonoInDesarrollo(desarrolloId, phoneDigits);
    if (match) {
      return match.prospecto;
    }
  }

  return null;
};

export type VisitaProspectoSyncInput = {
  visitaId: string;
  tipo: VisitaTipo;
  desarrolloId: string;
  asesorId: string;
  clienteNombre?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  medioContacto?: string;
  visitaRealizadaOn?: string;
};

/** Crea o actualiza prospecto al registrar una visita comercial (recorrido). */
export const syncProspectoFromVisita = async (
  input: VisitaProspectoSyncInput,
): Promise<ProspectoRecord | null> => {
  const nombre = input.clienteNombre?.trim();
  if (!nombre) {
    return null;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const existing = await findProspectoByContact(
    input.desarrolloId,
    input.clienteEmail,
    input.clienteTelefono,
  );

  const etapa = existing
    ? mergeProspectoEtapaFromVisita(existing.etapa, input.tipo)
    : mergeProspectoEtapaFromVisita("nuevo", input.tipo);

  const patch = {
    nombre,
    email: normalizeEmail(input.clienteEmail),
    telefono: input.clienteTelefono?.trim() || null,
    medio_contacto: input.medioContacto?.trim() || null,
    asesor_id: input.asesorId,
    visita_id: input.visitaId,
    etapa,
    updated_at: new Date().toISOString(),
    ...(input.tipo === "recorrido_completado" && input.visitaRealizadaOn
      ? { visita_realizada_on: input.visitaRealizadaOn }
      : {}),
  };

  if (existing) {
    const { data, error } = await supabase
      .from("prospectos")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as ProspectoRecord;
  }

  const { data, error } = await supabase
    .from("prospectos")
    .insert({
      desarrollo_id: input.desarrolloId,
      ...patch,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProspectoRecord;
};

export const createProspecto = async (input: ProspectoInput) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase
    .from("prospectos")
    .insert(toRow(input))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProspectoRecord;
};

export const upsertProspectoFromVisita = async (input: ProspectoInput) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const existing = await findProspectoByContact(
    input.desarrolloId,
    input.email,
    input.telefono,
  );

  if (existing) {
    const nextEtapa = input.etapa
      ? mergeProspectoEtapa(existing.etapa, input.etapa as ProspectoEtapa)
      : existing.etapa;
    const { data, error } = await supabase
      .from("prospectos")
      .update({
        ...toRow(input),
        etapa: nextEtapa,
        visita_id: input.visitaId ?? existing.visita_id,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as ProspectoRecord;
  }

  return createProspecto(input);
};

export type CotizacionInput = {
  desarrolloId: string;
  prospectoId?: string;
  asesorId?: string;
  unidadId?: string;
  clusterId?: string;
  prototipoId?: string;
  unidadNumero?: string;
  tipoUnidad?: string;
  clienteNombre?: string;
  precioLista?: number;
  esquemaPago?: string;
  descuentoPct?: number;
  precioTotal?: number;
  payload?: Record<string, unknown>;
  pdfGenerado?: boolean;
};

export const saveCotizacion = async (input: CotizacionInput) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase
    .from("cotizaciones")
    .insert({
      desarrollo_id: input.desarrolloId,
      prospecto_id: input.prospectoId ?? null,
      asesor_id: input.asesorId ?? null,
      unidad_id: input.unidadId ?? null,
      cluster_id: input.clusterId ?? null,
      prototipo_id: input.prototipoId ?? null,
      unidad_numero: input.unidadNumero ?? null,
      tipo_unidad: input.tipoUnidad ?? null,
      cliente_nombre: input.clienteNombre?.trim() || null,
      precio_lista: input.precioLista ?? null,
      esquema_pago: input.esquemaPago ?? null,
      descuento_pct: input.descuentoPct ?? null,
      precio_total: input.precioTotal ?? null,
      payload: input.payload ?? {},
      pdf_generado_at: input.pdfGenerado ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (input.prospectoId) {
    const { data: prospecto } = await supabase
      .from("prospectos")
      .select("etapa")
      .eq("id", input.prospectoId)
      .maybeSingle();

    const etapa = prospecto?.etapa
      ? mergeProspectoEtapa(prospecto.etapa, "cotizo")
      : "cotizo";

    await supabase
      .from("prospectos")
      .update({ etapa, updated_at: new Date().toISOString() })
      .eq("id", input.prospectoId);
  }

  return data;
};

export type LeadIntelligenceSyncResult = {
  total: number;
  duplicados: number;
  scoresUpdated: number;
};

export const syncLeadIntelligenceForDesarrollo = async (
  desarrolloId: string,
  profile: AdminProfile,
): Promise<LeadIntelligenceSyncResult> => {
  if (!canAccessDesarrollo(profile, desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase
    .from("prospectos")
    .select("*")
    .eq("desarrollo_id", desarrolloId)
    .eq("activo", true);

  if (error) {
    throw new Error(error.message);
  }

  const prospectos = (data ?? []) as ProspectoRecord[];
  const duplicateIds = pickDuplicateIds(prospectos);
  let scoresUpdated = 0;

  for (const prospecto of prospectos) {
    const esDuplicado = duplicateIds.has(prospecto.id);
    const iscore = computeIscore({ ...prospecto, es_duplicado: esDuplicado });
    const sellerScore = computeSellerScore({ ...prospecto, es_duplicado: esDuplicado });

    if (
      prospecto.es_duplicado !== esDuplicado ||
      prospecto.iscore !== iscore ||
      prospecto.seller_score !== sellerScore
    ) {
      const { error: updateError } = await supabase
        .from("prospectos")
        .update({
          es_duplicado: esDuplicado,
          iscore,
          seller_score: sellerScore,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prospecto.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
      scoresUpdated += 1;
    }
  }

  return {
    total: prospectos.length,
    duplicados: duplicateIds.size,
    scoresUpdated,
  };
};

export const bulkDeactivateProspectos = async (
  ids: string[],
  profile?: AdminProfile,
): Promise<number> => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) {
    return 0;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: rows, error: fetchError } = await supabase
    .from("prospectos")
    .select("id, desarrollo_id")
    .in("id", uniqueIds)
    .eq("activo", true);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const allowed = (rows ?? []).filter(
    (row) => !profile || canAccessDesarrollo(profile, row.desarrollo_id as string),
  );

  if (!allowed.length) {
    throw new Error("No tienes permiso para eliminar estos leads.");
  }

  const allowedIds = allowed.map((row) => row.id as string);
  const { error: updateError } = await supabase
    .from("prospectos")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .in("id", allowedIds);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return allowedIds.length;
};
