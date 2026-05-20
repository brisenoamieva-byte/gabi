import { getDefaultRecorridoContenido } from "@/lib/catalog/recorrido-content";
import { assertCatalogId } from "@/lib/catalog/slug";
import { DEFAULT_RECORRIDO_ETAPAS } from "@/lib/catalog/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type ComercializadoraAdminRecord = {
  id: string;
  slug: string;
  nombre: string;
  logo: string | null;
  usuario: string;
  colorPrimary: string;
  colorAccent: string;
  activo: boolean;
  portalPath: string;
  desarrollosCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DesarrolloCatalogAdminRecord = {
  id: string;
  comercializadoraId: string;
  nombre: string;
  slug: string;
  desarrollador: string;
  ubicacion: string;
  descripcion: string;
  precioDesde: number;
  tiposProducto: string[];
  estado: "activo" | "proximamente";
  logo: string | null;
  desarrolladorLogo: string | null;
  colorPrincipal: string;
  colorAcento: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ComercializadoraInput = {
  id: string;
  slug: string;
  nombre: string;
  usuario: string;
  logo?: string | null;
  colorPrimary?: string;
  colorAccent?: string;
  activo?: boolean;
};

export type DesarrolloCatalogInput = {
  id: string;
  comercializadoraId: string;
  nombre: string;
  slug: string;
  desarrollador?: string;
  ubicacion?: string;
  descripcion?: string;
  precioDesde?: number;
  tiposProducto?: string[];
  estado?: "activo" | "proximamente";
  logo?: string | null;
  desarrolladorLogo?: string | null;
  colorPrincipal?: string;
  colorAcento?: string;
  activo?: boolean;
};

const toComercializadoraAdmin = (
  row: {
    id: string;
    slug: string;
    nombre: string;
    logo: string | null;
    usuario: string;
    color_primary: string;
    color_accent: string;
    activo: boolean;
    created_at: string;
    updated_at: string;
  },
  desarrollosCount = 0,
): ComercializadoraAdminRecord => ({
  id: row.id,
  slug: row.slug,
  nombre: row.nombre,
  logo: row.logo,
  usuario: row.usuario,
  colorPrimary: row.color_primary,
  colorAccent: row.color_accent,
  activo: row.activo,
  portalPath: `/portal/${row.slug}`,
  desarrollosCount,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toDesarrolloAdmin = (row: {
  id: string;
  comercializadora_id: string;
  nombre: string;
  slug: string;
  desarrollador: string | null;
  ubicacion: string | null;
  descripcion: string | null;
  precio_desde: number | null;
  tipos_producto: string[] | null;
  estado: "activo" | "proximamente";
  logo: string | null;
  desarrollador_logo: string | null;
  color_principal: string | null;
  color_acento: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}): DesarrolloCatalogAdminRecord => ({
  id: row.id,
  comercializadoraId: row.comercializadora_id,
  nombre: row.nombre,
  slug: row.slug,
  desarrollador: row.desarrollador ?? "",
  ubicacion: row.ubicacion ?? "",
  descripcion: row.descripcion ?? "",
  precioDesde: Number(row.precio_desde ?? 0),
  tiposProducto: row.tipos_producto ?? [],
  estado: row.estado,
  logo: row.logo,
  desarrolladorLogo: row.desarrollador_logo,
  colorPrincipal: row.color_principal ?? "#13315C",
  colorAcento: row.color_acento ?? "#2DD4BF",
  activo: row.activo,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const listComercializadoras = async (options?: {
  includeInactive?: boolean;
}): Promise<ComercializadoraAdminRecord[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  let query = supabase
    .from("comercializadoras")
    .select("*")
    .order("nombre", { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq("activo", true);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const { data: desarrollos, error: desarrollosError } = await supabase
    .from("desarrollos_catalog")
    .select("comercializadora_id");

  if (desarrollosError) {
    throw new Error(desarrollosError.message);
  }

  const counts = (desarrollos ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.comercializadora_id] = (acc[row.comercializadora_id] ?? 0) + 1;
    return acc;
  }, {});

  return (data ?? []).map((row) => toComercializadoraAdmin(row, counts[row.id] ?? 0));
};

export const getComercializadoraById = async (
  id: string,
): Promise<ComercializadoraAdminRecord | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase
    .from("comercializadoras")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const { count } = await supabase
    .from("desarrollos_catalog")
    .select("*", { count: "exact", head: true })
    .eq("comercializadora_id", id);

  return toComercializadoraAdmin(data, count ?? 0);
};

export const createComercializadora = async (
  input: ComercializadoraInput,
): Promise<ComercializadoraAdminRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const id = assertCatalogId(input.id, "ID");
  const slug = assertCatalogId(input.slug, "Slug");
  const usuario = input.usuario.trim().toLowerCase();

  if (!input.nombre.trim()) {
    throw new Error("El nombre es obligatorio.");
  }

  if (!usuario) {
    throw new Error("El usuario de portal es obligatorio.");
  }

  const { data, error } = await supabase
    .from("comercializadoras")
    .insert({
      id,
      slug,
      nombre: input.nombre.trim(),
      usuario,
      logo: input.logo ?? null,
      color_primary: input.colorPrimary ?? "#13315C",
      color_accent: input.colorAccent ?? "#2DD4BF",
      activo: input.activo ?? true,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toComercializadoraAdmin(data, 0);
};

export const updateComercializadora = async (
  id: string,
  input: Partial<Omit<ComercializadoraInput, "id">>,
): Promise<ComercializadoraAdminRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.slug !== undefined) {
    patch.slug = assertCatalogId(input.slug, "Slug");
  }
  if (input.nombre !== undefined) {
    if (!input.nombre.trim()) {
      throw new Error("El nombre es obligatorio.");
    }
    patch.nombre = input.nombre.trim();
  }
  if (input.usuario !== undefined) {
    const usuario = input.usuario.trim().toLowerCase();
    if (!usuario) {
      throw new Error("El usuario de portal es obligatorio.");
    }
    patch.usuario = usuario;
  }
  if (input.logo !== undefined) {
    patch.logo = input.logo;
  }
  if (input.colorPrimary !== undefined) {
    patch.color_primary = input.colorPrimary;
  }
  if (input.colorAccent !== undefined) {
    patch.color_accent = input.colorAccent;
  }
  if (input.activo !== undefined) {
    patch.activo = input.activo;
  }

  const { data, error } = await supabase
    .from("comercializadoras")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { count } = await supabase
    .from("desarrollos_catalog")
    .select("*", { count: "exact", head: true })
    .eq("comercializadora_id", id);

  return toComercializadoraAdmin(data, count ?? 0);
};

export const listDesarrollosCatalog = async (options?: {
  comercializadoraId?: string;
  includeInactive?: boolean;
}): Promise<DesarrolloCatalogAdminRecord[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  let query = supabase.from("desarrollos_catalog").select("*").order("nombre", { ascending: true });

  if (options?.comercializadoraId) {
    query = query.eq("comercializadora_id", options.comercializadoraId);
  }

  if (!options?.includeInactive) {
    query = query.eq("activo", true);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(toDesarrolloAdmin);
};

export const getDesarrolloCatalogById = async (
  id: string,
): Promise<DesarrolloCatalogAdminRecord | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data, error } = await supabase
    .from("desarrollos_catalog")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toDesarrolloAdmin(data) : null;
};

export const createDesarrolloCatalog = async (
  input: DesarrolloCatalogInput,
): Promise<DesarrolloCatalogAdminRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const id = assertCatalogId(input.id, "ID");
  const slug = assertCatalogId(input.slug, "Slug");

  if (!input.nombre.trim()) {
    throw new Error("El nombre es obligatorio.");
  }

  if (!input.comercializadoraId.trim()) {
    throw new Error("Selecciona una comercializadora.");
  }

  const { data: comercializadora } = await supabase
    .from("comercializadoras")
    .select("id")
    .eq("id", input.comercializadoraId)
    .maybeSingle();

  if (!comercializadora) {
    throw new Error("La comercializadora no existe.");
  }

  const { data, error } = await supabase
    .from("desarrollos_catalog")
    .insert({
      id,
      comercializadora_id: input.comercializadoraId,
      nombre: input.nombre.trim(),
      slug,
      desarrollador: input.desarrollador?.trim() ?? null,
      ubicacion: input.ubicacion?.trim() ?? null,
      descripcion: input.descripcion?.trim() ?? null,
      precio_desde: input.precioDesde ?? null,
      tipos_producto: input.tiposProducto ?? [],
      estado: input.estado ?? "activo",
      logo: input.logo ?? null,
      desarrollador_logo: input.desarrolladorLogo ?? null,
      color_principal: input.colorPrincipal ?? "#13315C",
      color_acento: input.colorAcento ?? "#2DD4BF",
      crm: { provider: "none", enabled: false },
      recorrido_etapas: [...DEFAULT_RECORRIDO_ETAPAS],
      recorrido_version: 2,
      recorrido_contenido: getDefaultRecorridoContenido(id),
      activo: input.activo ?? true,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toDesarrolloAdmin(data);
};

export const updateDesarrolloCatalog = async (
  id: string,
  input: Partial<Omit<DesarrolloCatalogInput, "id">>,
): Promise<DesarrolloCatalogAdminRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.comercializadoraId !== undefined) {
    if (!input.comercializadoraId.trim()) {
      throw new Error("Selecciona una comercializadora.");
    }
    patch.comercializadora_id = input.comercializadoraId;
  }
  if (input.slug !== undefined) {
    patch.slug = assertCatalogId(input.slug, "Slug");
  }
  if (input.nombre !== undefined) {
    if (!input.nombre.trim()) {
      throw new Error("El nombre es obligatorio.");
    }
    patch.nombre = input.nombre.trim();
  }
  if (input.desarrollador !== undefined) {
    patch.desarrollador = input.desarrollador.trim() || null;
  }
  if (input.ubicacion !== undefined) {
    patch.ubicacion = input.ubicacion.trim() || null;
  }
  if (input.descripcion !== undefined) {
    patch.descripcion = input.descripcion.trim() || null;
  }
  if (input.precioDesde !== undefined) {
    patch.precio_desde = input.precioDesde;
  }
  if (input.tiposProducto !== undefined) {
    patch.tipos_producto = input.tiposProducto;
  }
  if (input.estado !== undefined) {
    patch.estado = input.estado;
  }
  if (input.logo !== undefined) {
    patch.logo = input.logo;
  }
  if (input.desarrolladorLogo !== undefined) {
    patch.desarrollador_logo = input.desarrolladorLogo;
  }
  if (input.colorPrincipal !== undefined) {
    patch.color_principal = input.colorPrincipal;
  }
  if (input.colorAcento !== undefined) {
    patch.color_acento = input.colorAcento;
  }
  if (input.activo !== undefined) {
    patch.activo = input.activo;
  }

  const { data, error } = await supabase
    .from("desarrollos_catalog")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toDesarrolloAdmin(data);
};
