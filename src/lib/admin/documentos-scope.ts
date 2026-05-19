import type { Cluster, DisponibilidadUnidad } from "@/lib/data";
import type { DocumentoTipo } from "@/lib/admin/types";

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
  if (categoria !== "brochure") {
    return "otro";
  }
  return alcance === "desarrollo" ? "brochure_desarrollo" : "brochure_cluster";
};

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
