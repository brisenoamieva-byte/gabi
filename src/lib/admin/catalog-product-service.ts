import type { Cluster, Prototipo } from "@/lib/data";
import { assertCatalogId, slugifyCatalogId } from "@/lib/catalog/slug";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type ClusterCatalogAdminRecord = Cluster & {
  desarrolloId: string;
  orden: number;
};

export type PrototipoCatalogAdminRecord = Prototipo & {
  desarrolloId: string;
};

export type ClusterCatalogInput = {
  id: string;
  nombre: string;
  slug?: string;
  tipo: Cluster["tipo"];
  logo?: string;
  fotoPortada?: string;
  descripcion?: string;
  precioDesde?: number;
  totalViviendas?: number;
  entregaGeneral?: string;
  amenidades?: string[];
  activo?: boolean;
};

export type PrototipoCatalogInput = {
  id: string;
  clusterId: string;
  nombre: string;
  slug?: string;
  construccionM2?: number;
  terrenoM2?: number;
  precioFinal?: number;
  precioBase?: number;
  entrega?: string;
  fotos?: string[];
  planos?: string[];
  activo?: boolean;
  soldOut?: boolean;
};

type ClusterRow = {
  id: string;
  desarrollo_id: string;
  payload: Omit<Cluster, "id">;
  orden: number;
  activo: boolean;
};

type PrototipoRow = {
  id: string;
  desarrollo_id: string;
  cluster_id: string;
  payload: Omit<Prototipo, "id" | "clusterId">;
  activo: boolean;
};

const toClusterAdmin = (row: ClusterRow): ClusterCatalogAdminRecord => ({
  id: row.id,
  desarrolloId: row.desarrollo_id,
  orden: row.orden,
  ...(row.payload as Omit<Cluster, "id">),
  activo: row.activo && row.payload.activo !== false,
});

const toPrototipoAdmin = (row: PrototipoRow): PrototipoCatalogAdminRecord => ({
  id: row.id,
  clusterId: row.cluster_id,
  desarrolloId: row.desarrollo_id,
  ...(row.payload as Omit<Prototipo, "id" | "clusterId">),
  activo: row.activo && row.payload.activo !== false,
});

const defaultClusterPayload = (input: ClusterCatalogInput): Omit<Cluster, "id"> => ({
  nombre: input.nombre.trim(),
  slug: input.slug ? assertCatalogId(input.slug, "Slug") : slugifyCatalogId(input.nombre),
  tipo: input.tipo,
  totalViviendas: input.totalViviendas ?? 0,
  descripcion: input.descripcion?.trim() ?? "",
  precioDesde: input.precioDesde ?? 0,
  entregaGeneral: input.entregaGeneral?.trim() || "Por definir",
  amenidades: input.amenidades ?? [],
  fotoPortada: input.fotoPortada ?? "",
  logo: input.logo ?? "",
  activo: input.activo ?? true,
});

const defaultPrototipoPayload = (
  input: PrototipoCatalogInput,
): Omit<Prototipo, "id" | "clusterId"> => ({
  nombre: input.nombre.trim(),
  slug: input.slug ? assertCatalogId(input.slug, "Slug") : slugifyCatalogId(input.nombre),
  construccionM2: input.construccionM2 ?? 0,
  terrenoM2: input.terrenoM2,
  niveles: 1,
  recamaras: 0,
  banos: 0,
  precioBase: input.precioBase ?? input.precioFinal ?? 0,
  bonoMaximo: 0,
  precioFinal: input.precioFinal ?? input.precioBase ?? 0,
  entrega: input.entrega?.trim() || "Por definir",
  equipamientoIncluido: [],
  noIncluye: [],
  planos: input.planos ?? [],
  fotos: input.fotos ?? [],
  activo: input.activo ?? true,
  soldOut: input.soldOut ?? false,
});

export const listProductoCatalogForDesarrollo = async (desarrolloId: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const [clustersRes, prototiposRes] = await Promise.all([
    supabase
      .from("clusters_catalog")
      .select("id, desarrollo_id, payload, orden, activo")
      .eq("desarrollo_id", desarrolloId)
      .order("orden", { ascending: true }),
    supabase
      .from("prototipos_catalog")
      .select("id, desarrollo_id, cluster_id, payload, activo")
      .eq("desarrollo_id", desarrolloId)
      .order("id", { ascending: true }),
  ]);

  if (clustersRes.error) {
    throw new Error(clustersRes.error.message);
  }
  if (prototiposRes.error) {
    throw new Error(prototiposRes.error.message);
  }

  return {
    clusters: (clustersRes.data ?? []).map((row) => toClusterAdmin(row as ClusterRow)),
    prototipos: (prototiposRes.data ?? []).map((row) => toPrototipoAdmin(row as PrototipoRow)),
  };
};

export const createClusterCatalog = async (
  desarrolloId: string,
  input: ClusterCatalogInput,
): Promise<ClusterCatalogAdminRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const id = assertCatalogId(input.id, "ID");
  if (!input.nombre.trim()) {
    throw new Error("El nombre del cluster es obligatorio.");
  }

  const { data: desarrollo } = await supabase
    .from("desarrollos_catalog")
    .select("id")
    .eq("id", desarrolloId)
    .maybeSingle();

  if (!desarrollo) {
    throw new Error("El desarrollo no existe.");
  }

  const { count } = await supabase
    .from("clusters_catalog")
    .select("id", { count: "exact", head: true })
    .eq("desarrollo_id", desarrolloId);

  const payload = defaultClusterPayload(input);
  const { data, error } = await supabase
    .from("clusters_catalog")
    .insert({
      id,
      desarrollo_id: desarrolloId,
      payload,
      orden: count ?? 0,
      activo: input.activo ?? true,
      updated_at: new Date().toISOString(),
    })
    .select("id, desarrollo_id, payload, orden, activo")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toClusterAdmin(data as ClusterRow);
};

export const updateClusterCatalog = async (
  desarrolloId: string,
  clusterId: string,
  input: {
    payload?: Partial<Omit<Cluster, "id">>;
    activo?: boolean;
    orden?: number;
  },
): Promise<ClusterCatalogAdminRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("clusters_catalog")
    .select("id, desarrollo_id, payload, orden, activo")
    .eq("id", clusterId)
    .eq("desarrollo_id", desarrolloId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!existing) {
    throw new Error("Cluster no encontrado.");
  }

  const currentPayload = existing.payload as Omit<Cluster, "id">;
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.payload) {
    patch.payload = { ...currentPayload, ...input.payload };
  }
  if (input.activo !== undefined) {
    patch.activo = input.activo;
  }
  if (input.orden !== undefined) {
    patch.orden = input.orden;
  }

  const { data, error } = await supabase
    .from("clusters_catalog")
    .update(patch)
    .eq("id", clusterId)
    .eq("desarrollo_id", desarrolloId)
    .select("id, desarrollo_id, payload, orden, activo")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toClusterAdmin(data as ClusterRow);
};

export const createPrototipoCatalog = async (
  desarrolloId: string,
  input: PrototipoCatalogInput,
): Promise<PrototipoCatalogAdminRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const id = assertCatalogId(input.id, "ID");
  const clusterId = assertCatalogId(input.clusterId, "Cluster");

  if (!input.nombre.trim()) {
    throw new Error("El nombre del prototipo es obligatorio.");
  }

  const { data: cluster } = await supabase
    .from("clusters_catalog")
    .select("id")
    .eq("id", clusterId)
    .eq("desarrollo_id", desarrolloId)
    .maybeSingle();

  if (!cluster) {
    throw new Error("El cluster no existe en este desarrollo.");
  }

  const payload = defaultPrototipoPayload(input);
  const { data, error } = await supabase
    .from("prototipos_catalog")
    .insert({
      id,
      desarrollo_id: desarrolloId,
      cluster_id: clusterId,
      payload,
      activo: input.activo ?? true,
      updated_at: new Date().toISOString(),
    })
    .select("id, desarrollo_id, cluster_id, payload, activo")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toPrototipoAdmin(data as PrototipoRow);
};

export const updatePrototipoCatalog = async (
  desarrolloId: string,
  prototipoId: string,
  input: {
    payload?: Partial<Omit<Prototipo, "id" | "clusterId">>;
    clusterId?: string;
    activo?: boolean;
  },
): Promise<PrototipoCatalogAdminRecord> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("prototipos_catalog")
    .select("id, desarrollo_id, cluster_id, payload, activo")
    .eq("id", prototipoId)
    .eq("desarrollo_id", desarrolloId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!existing) {
    throw new Error("Prototipo no encontrado.");
  }

  if (input.clusterId) {
    const nextClusterId = assertCatalogId(input.clusterId, "Cluster");
    const { data: cluster } = await supabase
      .from("clusters_catalog")
      .select("id")
      .eq("id", nextClusterId)
      .eq("desarrollo_id", desarrolloId)
      .maybeSingle();

    if (!cluster) {
      throw new Error("El cluster no existe en este desarrollo.");
    }
  }

  const currentPayload = existing.payload as Omit<Prototipo, "id" | "clusterId">;
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.payload) {
    patch.payload = { ...currentPayload, ...input.payload };
  }
  if (input.clusterId !== undefined) {
    patch.cluster_id = assertCatalogId(input.clusterId, "Cluster");
  }
  if (input.activo !== undefined) {
    patch.activo = input.activo;
  }

  const { data, error } = await supabase
    .from("prototipos_catalog")
    .update(patch)
    .eq("id", prototipoId)
    .eq("desarrollo_id", desarrolloId)
    .select("id, desarrollo_id, cluster_id, payload, activo")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toPrototipoAdmin(data as PrototipoRow);
};
