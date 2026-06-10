import {
  clusters as fallbackClusters,
  comercializadores as fallbackComercializadores,
  desarrollos as fallbackDesarrollos,
  prototipos as fallbackPrototipos,
  type Cluster,
  type Desarrollo,
  type Prototipo,
} from "@/lib/data";
import { pasajeAlamosPrototipos } from "@/lib/catalog/pasaje-alamos.generated";
import { getInvesttiSimuladorDesarrolloIds } from "@/lib/portal/investti-simulador";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  applyDesarrolloCodeDefaults,
  applyRecorridoCodeDefaults,
} from "@/lib/catalog/code-sync";
import {
  getDefaultRecorridoContenido,
  mergeRecorridoContenido,
  type RecorridoContenido,
} from "@/lib/catalog/recorrido-content";
import {
  DEFAULT_RECORRIDO_ETAPAS,
  type ClusterRecord,
  type ComercializadoraRecord,
  type DesarrolloRecord,
  type PrototipoRecord,
} from "@/lib/catalog/types";

const LA_VISTA_ID = "la-vista-residencial";

const clusterDesarrolloId = (clusterId: string) =>
  fallbackClusters.find((cluster) => cluster.id === clusterId)?.desarrolloId ?? LA_VISTA_ID;

const fallbackPrototiposAll = (): Prototipo[] => [
  ...fallbackPrototipos,
  ...pasajeAlamosPrototipos,
];

const fallbackClustersForDesarrollo = (desarrolloId: string): ClusterRecord[] =>
  fallbackClusters
    .filter((cluster) => (cluster.desarrolloId ?? LA_VISTA_ID) === desarrolloId)
    .map((cluster) => ({ ...cluster, desarrolloId }));

const fallbackPrototiposForDesarrollo = (desarrolloId: string): PrototipoRecord[] =>
  fallbackPrototiposAll()
    .filter((item) => clusterDesarrolloId(item.clusterId) === desarrolloId)
    .map((prototipo) => ({ ...prototipo, desarrolloId }));

const toComercializadora = (row: {
  id: string;
  slug: string;
  nombre: string;
  logo: string | null;
  usuario: string;
  color_primary: string;
  color_accent: string;
}): ComercializadoraRecord => ({
  id: row.id,
  slug: row.slug,
  nombre: row.nombre,
  logo: row.logo,
  usuario: row.usuario,
  colorPrimary: row.color_primary,
  colorAccent: row.color_accent,
  portalPath: `/portal/${row.slug}`,
});

const toDesarrollo = (row: {
  id: string;
  comercializadora_id: string;
  nombre: string;
  slug: string;
  desarrollador: string | null;
  ubicacion: string | null;
  descripcion: string | null;
  precio_desde: number | null;
  tipos_producto: string[] | null;
  estado: Desarrollo["estado"];
  logo: string | null;
  desarrollador_logo: string | null;
  color_principal: string | null;
  color_acento: string | null;
  brochure_pdf: string | null;
  crm: Desarrollo["crm"] | null;
  recorrido_etapas: string[] | null;
  recorrido_version: number | null;
}): DesarrolloRecord =>
  applyDesarrolloCodeDefaults({
    id: row.id,
    comercializadoraId: row.comercializadora_id,
    nombre: row.nombre,
    slug: row.slug,
    desarrollador: row.desarrollador ?? "",
    comercializador: row.comercializadora_id,
    ubicacion: row.ubicacion ?? "",
    descripcion: row.descripcion ?? "",
    precioDesde: Number(row.precio_desde ?? 0),
    tiposProducto: (row.tipos_producto ?? []) as Desarrollo["tiposProducto"],
    estado: row.estado,
    logo: row.logo ?? undefined,
    desarrolladorLogo: row.desarrollador_logo ?? undefined,
    colorPrincipal: row.color_principal ?? "#13315C",
    colorAcento: row.color_acento ?? "#2DD4BF",
    brochurePdf: row.brochure_pdf ?? undefined,
    crm: row.crm ?? { provider: "none", enabled: false },
    recorridoEtapas: row.recorrido_etapas?.length
      ? row.recorrido_etapas
      : [...DEFAULT_RECORRIDO_ETAPAS],
    recorridoVersion: row.recorrido_version ?? 2,
  });

const fallbackComercializadora = (slug: string): ComercializadoraRecord | null => {
  const match = fallbackComercializadores.find((item) => item.slug === slug);
  if (!match) {
    return null;
  }

  return {
    id: match.id,
    slug: match.slug,
    nombre: match.nombre,
    logo: match.logo,
    usuario: match.usuario,
    colorPrimary: match.colorPrimary,
    colorAccent: match.colorAccent,
    portalPath: match.portalPath.startsWith("/portal/")
      ? match.portalPath
      : `/portal/${match.slug}`,
  };
};

const fallbackDesarrolloRecords = (): DesarrolloRecord[] =>
  fallbackDesarrollos.map((item) =>
    applyDesarrolloCodeDefaults({
      ...item,
      comercializadoraId: "bbr",
      recorridoEtapas: [...DEFAULT_RECORRIDO_ETAPAS],
      recorridoVersion: 2,
    }),
  );

export const getComercializadoraBySlug = async (
  slug: string,
): Promise<ComercializadoraRecord | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return fallbackComercializadora(slug);
  }

  const { data, error } = await supabase
    .from("comercializadoras")
    .select("id, slug, nombre, logo, usuario, color_primary, color_accent")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();

  if (error || !data) {
    return fallbackComercializadora(slug);
  }

  return toComercializadora(data);
};

export const getComercializadoraByUsuario = async (
  usuario: string,
): Promise<ComercializadoraRecord | null> => {
  const normalized = usuario.trim().toLowerCase();
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    const match = fallbackComercializadores.find(
      (item) => item.usuario.toLowerCase() === normalized,
    );
    return match ? fallbackComercializadora(match.slug) : null;
  }

  const { data, error } = await supabase
    .from("comercializadoras")
    .select("id, slug, nombre, logo, usuario, color_primary, color_accent")
    .eq("usuario", normalized)
    .eq("activo", true)
    .maybeSingle();

  if (error || !data) {
    const match = fallbackComercializadores.find(
      (item) => item.usuario.toLowerCase() === normalized,
    );
    return match ? fallbackComercializadora(match.slug) : null;
  }

  return toComercializadora(data);
};

export const getDesarrolloIdsForComercializadora = async (
  comercializadoraId: string,
): Promise<string[]> => {
  if (comercializadoraId === "investti") {
    return getInvesttiSimuladorDesarrolloIds();
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return fallbackDesarrollos
      .filter((item) => item.comercializador === "BBR Habitarea" || comercializadoraId === "bbr")
      .map((item) => item.id);
  }

  const { data, error } = await supabase
    .from("desarrollos_catalog")
    .select("id")
    .eq("comercializadora_id", comercializadoraId)
    .eq("activo", true)
    .eq("estado", "activo");

  if (error || !data?.length) {
    return fallbackDesarrollos
      .filter(
        (item) =>
          item.comercializador === "BBR Habitarea" || comercializadoraId === "bbr",
      )
      .map((item) => item.id);
  }

  return data.map((row) => row.id);
};

export const getDesarrollosByIds = async (ids: string[]): Promise<DesarrolloRecord[]> => {
  if (!ids.length) {
    return [];
  }

  const fallbackById = new Map(
    fallbackDesarrolloRecords()
      .filter((item) => ids.includes(item.id))
      .map((item) => [item.id, item] as const),
  );

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return ids
      .map((id) => fallbackById.get(id))
      .filter((item): item is DesarrolloRecord => Boolean(item));
  }

  const { data, error } = await supabase
    .from("desarrollos_catalog")
    .select("*")
    .in("id", ids)
    .eq("activo", true)
    .eq("estado", "activo");

  const byId = new Map<string, DesarrolloRecord>();

  if (!error && data?.length) {
    for (const row of data) {
      byId.set(row.id, toDesarrollo(row));
    }
  }

  for (const id of ids) {
    if (!byId.has(id)) {
      const fallback = fallbackById.get(id);
      if (fallback) {
        byId.set(id, fallback);
      }
    }
  }

  return ids
    .map((id) => byId.get(id))
    .filter((item): item is DesarrolloRecord => Boolean(item));
};

export const getDesarrolloById = async (id: string): Promise<DesarrolloRecord | null> => {
  const results = await getDesarrollosByIds([id]);
  return results[0] ?? null;
};

export const listActiveDesarrollos = async (): Promise<DesarrolloRecord[]> => {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return fallbackDesarrolloRecords().filter((item) => item.estado === "activo");
  }

  const { data, error } = await supabase
    .from("desarrollos_catalog")
    .select("*")
    .eq("activo", true)
    .eq("estado", "activo")
    .order("nombre", { ascending: true });

  if (error || !data?.length) {
    return fallbackDesarrolloRecords().filter((item) => item.estado === "activo");
  }

  return data.map(toDesarrollo);
};

export const getClustersForDesarrolloIds = async (ids: string[]): Promise<ClusterRecord[]> => {
  if (!ids.length) {
    return [];
  }

  const batches = await Promise.all(ids.map((id) => getClustersForDesarrollo(id)));
  return batches.flat();
};

export const getPrototiposForDesarrolloIds = async (ids: string[]): Promise<PrototipoRecord[]> => {
  if (!ids.length) {
    return [];
  }

  const batches = await Promise.all(ids.map((id) => getPrototiposForDesarrollo(id)));
  return batches.flat();
};

export const getClustersForDesarrollo = async (desarrolloId: string): Promise<ClusterRecord[]> => {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return fallbackClustersForDesarrollo(desarrolloId);
  }

  const { data, error } = await supabase
    .from("clusters_catalog")
    .select("id, desarrollo_id, payload")
    .eq("desarrollo_id", desarrolloId)
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error || !data?.length) {
    return fallbackClustersForDesarrollo(desarrolloId);
  }

  return data.map((row) => ({
    id: row.id,
    desarrolloId: row.desarrollo_id,
    ...(row.payload as Omit<Cluster, "id">),
  }));
};

export const getPrototiposForDesarrollo = async (
  desarrolloId: string,
): Promise<PrototipoRecord[]> => {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return fallbackPrototiposForDesarrollo(desarrolloId);
  }

  const { data, error } = await supabase
    .from("prototipos_catalog")
    .select("id, desarrollo_id, cluster_id, payload")
    .eq("desarrollo_id", desarrolloId)
    .eq("activo", true);

  if (error || !data?.length) {
    return fallbackPrototiposForDesarrollo(desarrolloId);
  }

  return data.map((row) => ({
    id: row.id,
    clusterId: row.cluster_id,
    desarrolloId: row.desarrollo_id,
    ...(row.payload as Omit<Prototipo, "id" | "clusterId">),
  }));
};

export const getPrototiposByCluster = async (
  desarrolloId: string,
  clusterId: string,
): Promise<PrototipoRecord[]> => {
  const all = await getPrototiposForDesarrollo(desarrolloId);
  return all.filter((item) => item.clusterId === clusterId && item.activo);
};

export const getClusterById = async (
  desarrolloId: string,
  clusterId: string,
): Promise<ClusterRecord | null> => {
  const clusters = await getClustersForDesarrollo(desarrolloId);
  return clusters.find((item) => item.id === clusterId) ?? null;
};

export const getPrototipoById = async (
  desarrolloId: string,
  prototipoId: string,
): Promise<PrototipoRecord | null> => {
  const prototipos = await getPrototiposForDesarrollo(desarrolloId);
  return prototipos.find((item) => item.id === prototipoId) ?? null;
};

export const getRecorridoContenidoForDesarrollo = async (
  desarrolloId: string,
): Promise<RecorridoContenido> => {
  const defaults = getDefaultRecorridoContenido(desarrolloId);
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return applyRecorridoCodeDefaults(desarrolloId, defaults);
  }

  const { data, error } = await supabase
    .from("desarrollos_catalog")
    .select("recorrido_contenido")
    .eq("id", desarrolloId)
    .maybeSingle();

  if (error || !data?.recorrido_contenido) {
    return applyRecorridoCodeDefaults(desarrolloId, defaults);
  }

  return applyRecorridoCodeDefaults(
    desarrolloId,
    mergeRecorridoContenido(
      defaults,
      data.recorrido_contenido as Partial<RecorridoContenido>,
    ),
  );
};
