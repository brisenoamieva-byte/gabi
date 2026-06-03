import { canAccessDesarrollo, isSuperAdmin } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import {
  isProspectoEtapa,
  mergeProspectoEtapa,
  mergeProspectoEtapaFromVisita,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";
import type { CotizacionRecord, ProspectoRecord } from "@/lib/comercial/sembrado-status";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { VisitaTipo } from "@/lib/visitas/types";

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
  iscore?: number | null;
  sellerScore?: number | null;
  asignadoPor?: string;
  esSpam?: boolean;
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
  telefono: input.telefono?.trim() || null,
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
    patch.telefono = input.telefono.trim() || null;
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
    patch.asesor_id = input.asesorId;
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

  const { error } = await supabase.from("prospectos").update(patch).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  const updated = await getProspectoById(id, profile);
  if (!updated) {
    throw new Error("No se pudo cargar el prospecto actualizado.");
  }

  return updated;
};

const normalizeEmail = (value?: string) => value?.trim().toLowerCase() || null;
const normalizePhoneDigits = (value?: string) => value?.replace(/\D/g, "") || null;

const findProspectoByContact = async (
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

  const phoneDigits = normalizePhoneDigits(telefono);
  if (phoneDigits && phoneDigits.length >= 10) {
    const { data: candidates } = await supabase
      .from("prospectos")
      .select("*")
      .eq("desarrollo_id", desarrolloId)
      .eq("activo", true)
      .not("telefono", "is", null)
      .order("updated_at", { ascending: false })
      .limit(50);

    const match = (candidates ?? []).find(
      (row) => normalizePhoneDigits(row.telefono as string) === phoneDigits,
    );

    if (match) {
      return match as ProspectoRecord;
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
