import { canAccessDesarrollo, isSuperAdmin } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import {
  syncSuperficieLegacyFields,
  type ProductoRecomendadoInput,
  type ProductoRecomendadoRecord,
} from "@/lib/inventario/productos-recomendados";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const toRow = (input: ProductoRecomendadoInput) => {
  const superficies = syncSuperficieLegacyFields(
    input.tipo,
    input.superficieTerrenoM2,
    input.superficieConstruccionM2,
  );

  return {
    desarrollo_id: input.desarrolloId,
    cluster_id: input.clusterId,
    unidad: input.unidad.trim(),
    tipo: input.tipo,
    estatus: input.estatus ?? "disponible",
    prototipo_id: input.prototipoId ?? null,
    precio: input.precio ?? null,
    ...superficies,
    entrega: input.entrega?.trim() || null,
  etapa: input.etapa?.trim() || null,
  torre: input.torre?.trim() || null,
  nivel: input.nivel?.trim() || null,
  notas: input.notas?.trim() || null,
  orden: input.orden ?? 0,
  visitable: input.visitable ?? true,
  prioridad_comercial: input.prioridadComercial ?? "media",
  razones_venta: input.razonesVenta ?? [],
  ubicacion_comercial: input.ubicacionComercial?.trim() || null,
  instruccion_recorrido: input.instruccionRecorrido?.trim() || null,
  nota_acceso: input.notaAcceso?.trim() || null,
  activo: true,
  updated_at: new Date().toISOString(),
  };
};

export const listProductosRecomendados = async (
  filters: { desarrolloId?: string; clusterId?: string; includeInactive?: boolean },
  profile?: AdminProfile,
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  if (profile && filters.desarrolloId && !canAccessDesarrollo(profile, filters.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  let query = supabase
    .from("disponibilidad_unidades")
    .select("*")
    .order("orden", { ascending: true })
    .order("updated_at", { ascending: false });

  if (!filters.includeInactive) {
    query = query.eq("activo", true);
  }

  if (filters.desarrolloId) {
    query = query.eq("desarrollo_id", filters.desarrolloId);
  }

  if (filters.clusterId) {
    query = query.eq("cluster_id", filters.clusterId);
  }

  if (profile && !isSuperAdmin(profile)) {
    if (!profile.desarrollosIds.length) {
      return [];
    }
    query = query.in("desarrollo_id", profile.desarrollosIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProductoRecomendadoRecord[];
};

export const getProductoRecomendadoById = async (id: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("disponibilidad_unidades")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ProductoRecomendadoRecord | null) ?? null;
};

export const createProductoRecomendado = async (input: ProductoRecomendadoInput) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase
    .from("disponibilidad_unidades")
    .insert(toRow(input))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductoRecomendadoRecord;
};

export const updateProductoRecomendado = async (
  id: string,
  input: Partial<ProductoRecomendadoInput> & { activo?: boolean },
) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.desarrolloId !== undefined) patch.desarrollo_id = input.desarrolloId;
  if (input.clusterId !== undefined) patch.cluster_id = input.clusterId;
  if (input.unidad !== undefined) patch.unidad = input.unidad.trim();
  if (input.tipo !== undefined) patch.tipo = input.tipo;
  if (input.estatus !== undefined) patch.estatus = input.estatus;
  if (input.prototipoId !== undefined) patch.prototipo_id = input.prototipoId;
  if (input.precio !== undefined) patch.precio = input.precio;
  if (input.superficieTerrenoM2 !== undefined || input.superficieConstruccionM2 !== undefined) {
    const existing = await getProductoRecomendadoById(id);
    const tipo = input.tipo ?? existing?.tipo ?? "casa";
    const terreno =
      input.superficieTerrenoM2 !== undefined
        ? input.superficieTerrenoM2
        : existing?.superficie_terreno_m2;
    const construccion =
      input.superficieConstruccionM2 !== undefined
        ? input.superficieConstruccionM2
        : existing?.superficie_construccion_m2;
    Object.assign(patch, syncSuperficieLegacyFields(tipo, terreno, construccion));
  } else if (input.tipo !== undefined) {
    const existing = await getProductoRecomendadoById(id);
    if (existing) {
      Object.assign(
        patch,
        syncSuperficieLegacyFields(
          input.tipo,
          existing.superficie_terreno_m2,
          existing.superficie_construccion_m2,
        ),
      );
    }
  }
  if (input.entrega !== undefined) patch.entrega = input.entrega?.trim() || null;
  if (input.etapa !== undefined) patch.etapa = input.etapa?.trim() || null;
  if (input.torre !== undefined) patch.torre = input.torre?.trim() || null;
  if (input.nivel !== undefined) patch.nivel = input.nivel?.trim() || null;
  if (input.notas !== undefined) patch.notas = input.notas?.trim() || null;
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
  if (input.activo !== undefined) patch.activo = input.activo;

  const { data, error } = await supabase
    .from("disponibilidad_unidades")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductoRecomendadoRecord;
};

export const deactivateProductoRecomendado = async (profile: AdminProfile, id: string) => {
  const existing = await getProductoRecomendadoById(id);
  if (!existing) {
    throw new Error("Producto no encontrado.");
  }

  if (!canAccessDesarrollo(profile, existing.desarrollo_id)) {
    throw new Error("No tienes permiso para este producto.");
  }

  return updateProductoRecomendado(id, { activo: false });
};

export const replaceProductosForCluster = async (
  profile: AdminProfile,
  desarrolloId: string,
  clusterId: string,
  inputs: ProductoRecomendadoInput[],
) => {
  if (!canAccessDesarrollo(profile, desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { error: deactivateError } = await supabase
    .from("disponibilidad_unidades")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("desarrollo_id", desarrolloId)
    .eq("cluster_id", clusterId)
    .eq("activo", true);

  if (deactivateError) {
    throw new Error(deactivateError.message);
  }

  if (!inputs.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("disponibilidad_unidades")
    .insert(inputs.map((input) => toRow(input)))
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProductoRecomendadoRecord[];
};
