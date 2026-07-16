import { assertDesarrolloAccess, canAccessDesarrollo } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import {
  getDefaultDescuentosEsquema,
  normalizeDescuentosEsquema,
  type ListaPrecioEsquemaDescuento,
} from "@/lib/admin/lista-precios-descuentos";
import type {
  ListaPrecioPreviewRow,
  ListaPreciosDetail,
  ListaPreciosRecord,
  ListaPreciosUnidadRecord,
} from "@/lib/admin/listas-precios-types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type {
  ListaPrecioPreviewRow,
  ListaPreciosDetail,
  ListaPreciosRecord,
  ListaPreciosUnidadRecord,
} from "@/lib/admin/listas-precios-types";
export {
  LISTA_PRECIOS_ESTADOS,
  listaPreciosEstadoLabel,
} from "@/lib/admin/listas-precios-types";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const dayBefore = (isoDate: string): string => {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};

const slugCodigo = (nombre: string, orden: number) => {
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `lista-${orden}`;
};

const mapLista = (
  row: Record<string, unknown>,
  descuentosFallback: ListaPrecioEsquemaDescuento[] = [],
): ListaPreciosRecord => ({
  id: row.id as string,
  desarrollo_id: row.desarrollo_id as string,
  nombre: row.nombre as string,
  codigo: row.codigo as string,
  vigencia_desde: row.vigencia_desde as string,
  vigencia_hasta: (row.vigencia_hasta as string | null) ?? null,
  estado: row.estado as ListaPreciosRecord["estado"],
  incremento_pct: row.incremento_pct != null ? Number(row.incremento_pct) : null,
  notas: (row.notas as string | null) ?? null,
  descuentos_esquema: normalizeDescuentosEsquema(
    row.descuentos_esquema,
    descuentosFallback.length
      ? descuentosFallback
      : getDefaultDescuentosEsquema(row.desarrollo_id as string),
  ),
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
});

export const listListasPrecios = async (
  desarrolloId: string,
  profile?: AdminProfile,
): Promise<ListaPreciosRecord[]> => {
  if (profile) {
    assertDesarrolloAccess(profile, desarrolloId);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("listas_precios")
    .select("*")
    .eq("desarrollo_id", desarrolloId)
    .order("vigencia_desde", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message.includes("schema cache") || error.code === "PGRST205") {
      throw new Error("Falta aplicar la migración 065_listas_precios.sql en Supabase.");
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapLista(row as Record<string, unknown>));
};

export const getListaPreciosActiva = async (
  desarrolloId: string,
  profile?: AdminProfile,
): Promise<ListaPreciosRecord | null> => {
  const listas = await listListasPrecios(desarrolloId, profile);
  return listas.find((item) => item.estado === "activa") ?? null;
};

export const getListaPreciosDetail = async (
  listaId: string,
  profile?: AdminProfile,
): Promise<ListaPreciosDetail | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: lista, error } = await supabase
    .from("listas_precios")
    .select("*")
    .eq("id", listaId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!lista) {
    return null;
  }

  if (profile && !canAccessDesarrollo(profile, lista.desarrollo_id as string)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const { data: unidadRows, error: unidadesError } = await supabase
    .from("lista_precios_unidades")
    .select(
      "id, lista_id, unidad_id, precio_lista, created_at, updated_at, unidad:disponibilidad_unidades(unidad, tipo, estatus)",
    )
    .eq("lista_id", listaId)
    .order("precio_lista", { ascending: false });

  if (unidadesError) {
    throw new Error(unidadesError.message);
  }

  const unidades: ListaPreciosUnidadRecord[] = (unidadRows ?? []).map((row) => {
    const unidadJoin = row.unidad as
      | { unidad?: string; tipo?: string; estatus?: string }
      | { unidad?: string; tipo?: string; estatus?: string }[]
      | null;
    const unidad = Array.isArray(unidadJoin) ? unidadJoin[0] : unidadJoin;
    return {
      id: row.id as string,
      lista_id: row.lista_id as string,
      unidad_id: row.unidad_id as string,
      precio_lista: Number(row.precio_lista),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      unidad: unidad?.unidad ?? null,
      tipo: unidad?.tipo ?? null,
      estatusInventario: unidad?.estatus ?? null,
    };
  });

  const mapped = mapLista(lista as Record<string, unknown>);
  return {
    ...mapped,
    unidades,
    unidadesCount: unidades.length,
  };
};

async function resolveBasePrecios(
  desarrolloId: string,
): Promise<Array<{ unidadId: string; unidad: string; tipo: string | null; precio: number }>> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const activa = await getListaPreciosActiva(desarrolloId);
  if (activa) {
    const detail = await getListaPreciosDetail(activa.id);
    if (detail?.unidades.length) {
      return detail.unidades.map((row) => ({
        unidadId: row.unidad_id,
        unidad: row.unidad ?? row.unidad_id,
        tipo: row.tipo ?? null,
        precio: row.precio_lista,
      }));
    }
  }

  const { data: units, error } = await supabase
    .from("disponibilidad_unidades")
    .select("id, unidad, tipo, precio")
    .eq("desarrollo_id", desarrolloId)
    .order("unidad", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (units ?? [])
    .filter((row) => row.precio != null && Number(row.precio) > 0)
    .map((row) => ({
      unidadId: row.id as string,
      unidad: row.unidad as string,
      tipo: (row.tipo as string | null) ?? null,
      precio: Number(row.precio),
    }));
}

export const previewIncrementoLista = async (
  desarrolloId: string,
  incrementoPct: number,
  profile?: AdminProfile,
): Promise<{ baseLista: ListaPreciosRecord | null; filas: ListaPrecioPreviewRow[] }> => {
  if (profile) {
    assertDesarrolloAccess(profile, desarrolloId);
  }
  if (!Number.isFinite(incrementoPct) || incrementoPct < -50 || incrementoPct > 200) {
    throw new Error("El incremento debe ser un porcentaje válido (ej. 3).");
  }

  const factor = 1 + incrementoPct / 100;
  const baseLista = await getListaPreciosActiva(desarrolloId);
  const base = await resolveBasePrecios(desarrolloId);

  return {
    baseLista,
    filas: base.map((row) => ({
      unidadId: row.unidadId,
      unidad: row.unidad,
      tipo: row.tipo,
      precioActual: row.precio,
      precioNuevo: roundMoney(row.precio * factor),
    })),
  };
};

export const createListaFromIncremento = async (
  input: {
    desarrolloId: string;
    incrementoPct: number;
    vigenciaDesde: string;
    nombre?: string;
    notas?: string;
  },
  profile?: AdminProfile,
): Promise<ListaPreciosDetail> => {
  if (profile) {
    assertDesarrolloAccess(profile, input.desarrolloId);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const preview = await previewIncrementoLista(
    input.desarrolloId,
    input.incrementoPct,
    profile,
  );
  if (!preview.filas.length) {
    throw new Error("No hay precios base para generar la lista. Carga inventario o una lista activa primero.");
  }

  const existing = await listListasPrecios(input.desarrolloId, profile);
  const nextOrden = existing.length + 1;
  const nombre = input.nombre?.trim() || `Lista ${nextOrden}`;
  let codigo = slugCodigo(nombre, nextOrden);
  if (existing.some((item) => item.codigo === codigo)) {
    codigo = `${codigo}-${Date.now().toString(36)}`;
  }

  const activa = await getListaPreciosActiva(input.desarrolloId);
  const descuentos =
    activa?.descuentos_esquema?.length
      ? activa.descuentos_esquema
      : getDefaultDescuentosEsquema(input.desarrolloId);

  const { data: lista, error } = await supabase
    .from("listas_precios")
    .insert({
      desarrollo_id: input.desarrolloId,
      nombre,
      codigo,
      vigencia_desde: input.vigenciaDesde,
      estado: "borrador",
      incremento_pct: input.incrementoPct,
      notas: input.notas?.trim() || null,
      descuentos_esquema: descuentos,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const rows = preview.filas.map((fila) => ({
    lista_id: lista.id,
    unidad_id: fila.unidadId,
    precio_lista: fila.precioNuevo,
  }));

  const { error: insertError } = await supabase.from("lista_precios_unidades").insert(rows);
  if (insertError) {
    await supabase.from("listas_precios").delete().eq("id", lista.id);
    throw new Error(insertError.message);
  }

  const detail = await getListaPreciosDetail(lista.id as string, profile);
  if (!detail) {
    throw new Error("No se pudo cargar la lista creada.");
  }
  return detail;
};

export const createListaFromInventario = async (
  input: {
    desarrolloId: string;
    vigenciaDesde: string;
    nombre?: string;
    notas?: string;
  },
  profile?: AdminProfile,
): Promise<ListaPreciosDetail> => {
  if (profile) {
    assertDesarrolloAccess(profile, input.desarrolloId);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const existing = await listListasPrecios(input.desarrolloId, profile);
  if (existing.some((item) => item.estado === "activa")) {
    throw new Error("Ya existe una lista activa. Usa «Generar siguiente lista» con incremento.");
  }

  const { data: units, error: unitsError } = await supabase
    .from("disponibilidad_unidades")
    .select("id, unidad, precio")
    .eq("desarrollo_id", input.desarrolloId);

  if (unitsError) {
    throw new Error(unitsError.message);
  }

  const priced = (units ?? []).filter((row) => row.precio != null && Number(row.precio) > 0);
  if (!priced.length) {
    throw new Error("No hay unidades con precio en inventario para crear Lista 1.");
  }

  const nombre = input.nombre?.trim() || "Lista 1";
  const codigo = slugCodigo(nombre, 1);

  const { data: lista, error } = await supabase
    .from("listas_precios")
    .insert({
      desarrollo_id: input.desarrolloId,
      nombre,
      codigo,
      vigencia_desde: input.vigenciaDesde,
      estado: "borrador",
      incremento_pct: null,
      notas: input.notas?.trim() || "Seed desde inventario vigente.",
      descuentos_esquema: getDefaultDescuentosEsquema(input.desarrolloId),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { error: insertError } = await supabase.from("lista_precios_unidades").insert(
    priced.map((row) => ({
      lista_id: lista.id,
      unidad_id: row.id,
      precio_lista: Number(row.precio),
    })),
  );

  if (insertError) {
    await supabase.from("listas_precios").delete().eq("id", lista.id);
    throw new Error(insertError.message);
  }

  const detail = await getListaPreciosDetail(lista.id as string, profile);
  if (!detail) {
    throw new Error("No se pudo cargar la lista creada.");
  }
  return detail;
};

export const updateListaPreciosUnidades = async (
  listaId: string,
  precios: Array<{ unidadId: string; precioLista: number }>,
  profile?: AdminProfile,
): Promise<ListaPreciosDetail> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const detail = await getListaPreciosDetail(listaId, profile);
  if (!detail) {
    throw new Error("Lista no encontrada.");
  }
  if (detail.estado !== "borrador") {
    throw new Error("Solo se pueden editar precios en listas en borrador.");
  }

  for (const item of precios) {
    if (!Number.isFinite(item.precioLista) || item.precioLista < 0) {
      throw new Error("Precio inválido.");
    }
    const { error } = await supabase
      .from("lista_precios_unidades")
      .update({
        precio_lista: roundMoney(item.precioLista),
        updated_at: new Date().toISOString(),
      })
      .eq("lista_id", listaId)
      .eq("unidad_id", item.unidadId);

    if (error) {
      throw new Error(error.message);
    }
  }

  await supabase
    .from("listas_precios")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", listaId);

  const updated = await getListaPreciosDetail(listaId, profile);
  if (!updated) {
    throw new Error("No se pudo recargar la lista.");
  }
  return updated;
};

export const updateListaPreciosDescuentos = async (
  listaId: string,
  descuentos: ListaPrecioEsquemaDescuento[],
  profile?: AdminProfile,
): Promise<ListaPreciosDetail> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const detail = await getListaPreciosDetail(listaId, profile);
  if (!detail) {
    throw new Error("Lista no encontrada.");
  }
  if (detail.estado === "cerrada") {
    throw new Error("No se pueden editar descuentos en una lista cerrada.");
  }

  const normalized = normalizeDescuentosEsquema(descuentos);
  if (!normalized.length) {
    throw new Error("Agrega al menos un esquema con descuento.");
  }

  const { error } = await supabase
    .from("listas_precios")
    .update({
      descuentos_esquema: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listaId);

  if (error) {
    if (error.message.includes("descuentos_esquema") || error.code === "PGRST204") {
      throw new Error("Falta aplicar la migración 075_lista_precios_descuentos.sql en Supabase.");
    }
    throw new Error(error.message);
  }

  const updated = await getListaPreciosDetail(listaId, profile);
  if (!updated) {
    throw new Error("No se pudo recargar la lista.");
  }
  return updated;
};

export const activateListaPrecios = async (
  listaId: string,
  profile?: AdminProfile,
): Promise<ListaPreciosDetail> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const detail = await getListaPreciosDetail(listaId, profile);
  if (!detail) {
    throw new Error("Lista no encontrada.");
  }
  if (detail.estado === "activa") {
    return detail;
  }
  if (detail.estado === "cerrada") {
    throw new Error("No se puede reactivar una lista cerrada.");
  }
  if (!detail.unidades.length) {
    throw new Error("La lista no tiene precios por unidad.");
  }

  const desarrolloId = detail.desarrollo_id;
  const activa = await getListaPreciosActiva(desarrolloId, profile);

  if (activa && activa.id !== listaId) {
    const hasta = dayBefore(detail.vigencia_desde);
    const { error: closeError } = await supabase
      .from("listas_precios")
      .update({
        estado: "cerrada",
        vigencia_hasta: hasta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activa.id);

    if (closeError) {
      throw new Error(closeError.message);
    }
  }

  const { error: activateError } = await supabase
    .from("listas_precios")
    .update({
      estado: "activa",
      vigencia_hasta: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listaId);

  if (activateError) {
    throw new Error(activateError.message);
  }

  // Actualiza inventario: precio + etiqueta lista solo en unidades no vendidas.
  for (const row of detail.unidades) {
    const { data: unit } = await supabase
      .from("disponibilidad_unidades")
      .select("id, estatus")
      .eq("id", row.unidad_id)
      .maybeSingle();

    if (!unit || unit.estatus === "vendido") {
      continue;
    }

    const { error: invError } = await supabase
      .from("disponibilidad_unidades")
      .update({
        precio: row.precio_lista,
        lista_precios: detail.nombre,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.unidad_id);

    if (invError) {
      throw new Error(invError.message);
    }
  }

  const updated = await getListaPreciosDetail(listaId, profile);
  if (!updated) {
    throw new Error("No se pudo recargar la lista activada.");
  }
  return updated;
};

const LISTAS_USABLES_APARTADO = new Set(["activa", "cerrada"]);

/** Listas que se pueden elegir al registrar un apartado (activa o cerrada). */
export const listListasPreciosParaApartado = async (
  desarrolloId: string,
  profile?: AdminProfile,
): Promise<ListaPreciosRecord[]> => {
  const listas = await listListasPrecios(desarrolloId, profile);
  return listas.filter((item) => LISTAS_USABLES_APARTADO.has(item.estado));
};

export const getPrecioListaForUnidad = async (
  listaId: string,
  unidadId: string,
): Promise<{ lista: ListaPreciosRecord; precioLista: number } | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data: lista, error: listaError } = await supabase
    .from("listas_precios")
    .select("*")
    .eq("id", listaId)
    .maybeSingle();

  if (listaError) {
    throw new Error(listaError.message);
  }
  if (!lista) {
    return null;
  }

  const { data, error } = await supabase
    .from("lista_precios_unidades")
    .select("precio_lista")
    .eq("lista_id", listaId)
    .eq("unidad_id", unidadId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return {
    lista: mapLista(lista as Record<string, unknown>),
    precioLista: Number(data.precio_lista),
  };
};

export const getPrecioListaActivaForUnidad = async (
  desarrolloId: string,
  unidadId: string,
): Promise<{ lista: ListaPreciosRecord; precioLista: number } | null> => {
  const activa = await getListaPreciosActiva(desarrolloId);
  if (!activa) {
    return null;
  }
  return getPrecioListaForUnidad(activa.id, unidadId);
};

/** Mapa unidad_id → precio de la lista activa (una query). Para overlay en sembrado/campo. */
export const getPreciosMapListaActiva = async (
  desarrolloId: string,
): Promise<{ lista: ListaPreciosRecord; precios: Map<string, number> } | null> => {
  const activa = await getListaPreciosActiva(desarrolloId);
  if (!activa) {
    return null;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("lista_precios_unidades")
    .select("unidad_id, precio_lista")
    .eq("lista_id", activa.id);

  if (error) {
    throw new Error(error.message);
  }

  const precios = new Map<string, number>();
  for (const row of data ?? []) {
    const unidadId = row.unidad_id as string;
    const precio = Number(row.precio_lista);
    if (unidadId && Number.isFinite(precio) && precio >= 0) {
      precios.set(unidadId, precio);
    }
  }

  return { lista: activa, precios };
};

export const resolveListaForApartado = async (
  desarrolloId: string,
  listaPreciosId?: string | null,
): Promise<{ id: string; nombre: string; estado: ListaPreciosRecord["estado"] } | null> => {
  if (listaPreciosId) {
    const supabase = createSupabaseServiceClient();
    if (!supabase) {
      throw new Error("Supabase no configurado.");
    }

    const { data, error } = await supabase
      .from("listas_precios")
      .select("*")
      .eq("id", listaPreciosId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Lista de precios no válida para este desarrollo.");
    }

    const lista = mapLista(data as Record<string, unknown>);
    if (lista.desarrollo_id !== desarrolloId) {
      throw new Error("Lista de precios no válida para este desarrollo.");
    }
    if (!LISTAS_USABLES_APARTADO.has(lista.estado)) {
      throw new Error("Solo puedes vender con una lista activa o cerrada (no borrador).");
    }
    return { id: lista.id, nombre: lista.nombre, estado: lista.estado };
  }

  const activa = await getListaPreciosActiva(desarrolloId);
  if (!activa) {
    return null;
  }
  return { id: activa.id, nombre: activa.nombre, estado: activa.estado };
};
