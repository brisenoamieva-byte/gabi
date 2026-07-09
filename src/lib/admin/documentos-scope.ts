import type { Cluster, DisponibilidadUnidad } from "@/lib/data";
import type { DocumentoRecord, DocumentoTipo } from "@/lib/admin/types";

export type DocumentoAlcanceKey = {
  desarrolloId: string;
  clusterId: string | null;
  etapa: string | null;
  prototipoId: string | null;
  tipo: DocumentoTipo;
};

const normalizeEtapa = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Misma lógica de alcance que al publicar / desactivar versiones anteriores. */
export const sameDocumentoAlcance = (
  doc: Pick<
    DocumentoRecord,
    "desarrollo_id" | "cluster_id" | "etapa" | "prototipo_id" | "tipo"
  >,
  key: DocumentoAlcanceKey,
) => {
  if (doc.desarrollo_id !== key.desarrolloId || doc.tipo !== key.tipo) {
    return false;
  }

  const docEtapa = normalizeEtapa(doc.etapa);
  const keyEtapa = normalizeEtapa(key.etapa);

  if (key.tipo === "ficha_tecnica") {
    return doc.prototipo_id === key.prototipoId;
  }

  if (key.tipo === "brochure_desarrollo" || key.tipo === "master_plan") {
    if (key.clusterId) {
      return doc.cluster_id === key.clusterId && !doc.prototipo_id && !normalizeEtapa(doc.etapa);
    }
    return !doc.cluster_id && !docEtapa && !doc.prototipo_id;
  }

  if (key.clusterId) {
    if (doc.cluster_id !== key.clusterId || doc.prototipo_id) {
      return false;
    }
    return docEtapa === keyEtapa;
  }

  return !doc.cluster_id && !docEtapa && !doc.prototipo_id;
};

/** Opciones del selector «Aplica a» en admin. */
export type DocumentoAlcance = "desarrollo" | "especifico";

/** Alcance persistido en API / base de datos. */
export type DocumentoAlcanceStorage = "desarrollo" | "cluster" | "etapa";

export type DocumentoCategoria =
  | "brochure"
  | "disponibilidad"
  | "ficha_tecnica"
  | "lista_precios"
  | "master_plan"
  | "otro";

export const documentoAlcanceLabel: Record<DocumentoAlcance, string> = {
  desarrollo: "Todo el desarrollo",
  especifico: "Cluster o etapa específica",
};

export const documentoCategoriaLabel: Record<DocumentoCategoria, string> = {
  brochure: "Brochure comercial",
  disponibilidad: "Disponibilidad",
  ficha_tecnica: "Ficha técnica",
  lista_precios: "Lista de precios",
  master_plan: "Master plan / Plano general",
  otro: "Otro documento",
};

export const resolveDocumentoAlcanceStorage = (
  alcance: DocumentoAlcance,
  etapa?: string,
): DocumentoAlcanceStorage => {
  if (alcance === "desarrollo") {
    return "desarrollo";
  }
  if (etapa?.trim()) {
    return "etapa";
  }
  return "cluster";
};

export const deriveDocumentoTipo = (
  alcance: DocumentoAlcanceStorage,
  categoria: DocumentoCategoria,
): DocumentoTipo => {
  if (categoria === "disponibilidad") {
    return "disponibilidad";
  }
  if (categoria === "ficha_tecnica") {
    return "ficha_tecnica";
  }
  if (categoria === "master_plan") {
    return "master_plan";
  }
  if (categoria !== "brochure") {
    return "otro";
  }
  return alcance === "desarrollo" ? "brochure_desarrollo" : "brochure_cluster";
};

export const buildDocumentoAlcanceKey = (input: {
  desarrolloId: string;
  clusterId: string | null;
  etapa: string | null;
  prototipoId: string | null;
  alcance: DocumentoAlcanceStorage;
  categoria: DocumentoCategoria;
}): DocumentoAlcanceKey => ({
  desarrolloId: input.desarrolloId,
  clusterId: input.clusterId,
  etapa: normalizeEtapa(input.etapa),
  prototipoId: input.prototipoId,
  tipo: deriveDocumentoTipo(input.alcance, input.categoria),
});

export const getEtapasForCluster = (
  cluster: Cluster | undefined,
  unidades: DisponibilidadUnidad[],
) => {
  const fromCluster =
    cluster?.entregaEtapas?.map((item) => item.etapa.trim()).filter(Boolean) ?? [];
  const fromUnidades = unidades
    .map((item) => item.etapa?.trim())
    .filter((item): item is string => Boolean(item));

  return Array.from(new Set([...fromCluster, ...fromUnidades])).sort((a, b) =>
    a.localeCompare(b, "es-MX", { numeric: true }),
  );
};

export const formatDocumentoAlcance = (input: {
  clusterId: string | null;
  etapa: string | null;
  prototipoId?: string | null;
  clusterNombre?: string;
  prototipoNombre?: string;
}) => {
  if (input.prototipoId) {
    const producto = input.prototipoNombre ?? input.prototipoId;
    return input.clusterNombre ? `${producto} · ${input.clusterNombre}` : producto;
  }
  if (!input.clusterId) {
    return "Desarrollo completo";
  }
  if (input.etapa) {
    return `${input.clusterNombre ?? input.clusterId} · Etapa ${input.etapa}`;
  }
  return input.clusterNombre ?? input.clusterId;
};
