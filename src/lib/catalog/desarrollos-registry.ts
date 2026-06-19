import type { Cluster } from "@/lib/data";
import { INVESTTI_CATALOG_DESARROLLO_IDS } from "@/lib/catalog/investti-desarrollos";
import { MISION_LA_GAVIA_DESARROLLO_ID } from "@/lib/catalog/mision-la-gavia";

/** Identificadores canónicos (compat con sembrado-status). */
export const PASAJE_ALAMOS_ID = "pasaje-alamos";
export const LA_VISTA_RESIDENCIAL_ID = "la-vista-residencial";

export type CotizadorKind = "generic" | "pasaje" | "investti" | "mision-gavia";

export type RegistryCotizadorRules = {
  enganchePct: number;
  apartado: number;
  descuentoStep: number;
  esquemas: ("mensualidades" | "contado")[];
};

export type DesarrolloSembradoSegment = {
  id: string;
  label: string;
  clusterId: string;
  resumenKey?: "departamentos" | "oficinas";
  tipo?: "departamento" | "oficina";
};

export type DesarrolloRegistryEntry = {
  id: string;
  clusterIds: string[];
  sembradoSegments?: DesarrolloSembradoSegment[];
  cotizadorKind: CotizadorKind;
  cotizadorRules?: RegistryCotizadorRules;
  reporteSemanalSegmented: boolean;
  selectorOrder: number;
};

const REGISTRY: DesarrolloRegistryEntry[] = [
  {
    id: LA_VISTA_RESIDENCIAL_ID,
    clusterIds: ["oliveto", "benevento", "volterra"],
    sembradoSegments: [
      { id: "oliveto", label: "Oliveto", clusterId: "oliveto" },
      { id: "benevento", label: "Benevento", clusterId: "benevento" },
      { id: "volterra", label: "Volterra", clusterId: "volterra" },
    ],
    cotizadorKind: "generic",
    cotizadorRules: {
      enganchePct: 0.1,
      apartado: 50000,
      descuentoStep: 5000,
      esquemas: ["mensualidades", "contado"],
    },
    reporteSemanalSegmented: true,
    selectorOrder: 10,
  },
  {
    id: PASAJE_ALAMOS_ID,
    clusterIds: ["pasaje-alamos-departamentos", "pasaje-alamos-oficinas"],
    sembradoSegments: [
      {
        id: "departamentos",
        label: "Departamentos",
        clusterId: "pasaje-alamos-departamentos",
        resumenKey: "departamentos",
        tipo: "departamento",
      },
      {
        id: "oficinas",
        label: "Oficinas",
        clusterId: "pasaje-alamos-oficinas",
        resumenKey: "oficinas",
        tipo: "oficina",
      },
    ],
    cotizadorKind: "pasaje",
    cotizadorRules: {
      enganchePct: 0.3,
      apartado: 50000,
      descuentoStep: 5000,
      esquemas: ["mensualidades", "contado"],
    },
    reporteSemanalSegmented: true,
    selectorOrder: 20,
  },
  {
    id: MISION_LA_GAVIA_DESARROLLO_ID,
    clusterIds: ["mision-la-gavia-departamentos"],
    cotizadorKind: "mision-gavia",
    reporteSemanalSegmented: false,
    selectorOrder: 30,
  },
  ...INVESTTI_CATALOG_DESARROLLO_IDS.map((id, index) => ({
    id,
    clusterIds: [`${id}-terrenos`],
    cotizadorKind: "investti" as const,
    reporteSemanalSegmented: false,
    selectorOrder: 40 + index,
  })),
];

const registryById = new Map(REGISTRY.map((entry) => [entry.id, entry]));

export function getDesarrolloRegistry(
  desarrolloId: string | null | undefined,
): DesarrolloRegistryEntry | null {
  if (!desarrolloId) {
    return null;
  }
  return registryById.get(desarrolloId) ?? null;
}

export function getClusterIdsForDesarrollo(desarrolloId: string): string[] {
  const entry = getDesarrolloRegistry(desarrolloId);
  if (entry?.clusterIds.length) {
    return entry.clusterIds;
  }
  return [];
}

/** Clusters del catálogo que pertenecen al desarrollo (registry + fallback `desarrolloId`). */
export function filterClustersForDesarrollo(
  desarrolloId: string,
  allClusters: Cluster[],
): Cluster[] {
  const registryIds = getClusterIdsForDesarrollo(desarrolloId);
  if (registryIds.length) {
    const idSet = new Set(registryIds);
    return allClusters.filter((cluster) => idSet.has(cluster.id));
  }

  return allClusters.filter(
    (cluster) =>
      cluster.desarrolloId === desarrolloId ||
      (!cluster.desarrolloId && desarrolloId === LA_VISTA_RESIDENCIAL_ID),
  );
}

export function getSembradoSegmentsForDesarrollo(
  desarrolloId: string,
): DesarrolloSembradoSegment[] {
  return getDesarrolloRegistry(desarrolloId)?.sembradoSegments ?? [];
}

export function getDefaultSembradoSegmentId(desarrolloId: string): string | null {
  const segments = getSembradoSegmentsForDesarrollo(desarrolloId);
  return segments[0]?.id ?? null;
}

export function getCotizadorKind(desarrolloId: string): CotizadorKind {
  return getDesarrolloRegistry(desarrolloId)?.cotizadorKind ?? "generic";
}

export function usesDedicatedSimulador(desarrolloId: string): boolean {
  return getCotizadorKind(desarrolloId) !== "generic";
}

export function getRegistryCotizadorRules(
  desarrolloId: string,
): RegistryCotizadorRules | null {
  return getDesarrolloRegistry(desarrolloId)?.cotizadorRules ?? null;
}

export function hasSegmentedReporteSemanal(desarrolloId: string): boolean {
  return getDesarrolloRegistry(desarrolloId)?.reporteSemanalSegmented ?? false;
}

/** Desarrollos con reporte multi-segmento (derivado del registry). */
export function getReporteSemanalDesarrolloIds(): string[] {
  return REGISTRY.filter((entry) => entry.reporteSemanalSegmented).map((entry) => entry.id);
}

export function getDesarrolloSelectorOrder(desarrolloId: string): number {
  return getDesarrolloRegistry(desarrolloId)?.selectorOrder ?? 500;
}

/** Compat: objetos usados históricamente en sembrado-status. */
export const PASAJE_SEMBRADO_SEGMENTOS = Object.fromEntries(
  (getDesarrolloRegistry(PASAJE_ALAMOS_ID)?.sembradoSegments ?? []).map((segment) => [
    segment.id,
    {
      id: segment.id,
      label: segment.label,
      clusterId: segment.clusterId,
      ...(segment.tipo ? { tipo: segment.tipo } : {}),
    },
  ]),
) as {
  departamentos: {
    id: "departamentos";
    label: string;
    clusterId: string;
    tipo: "departamento";
  };
  oficinas: {
    id: "oficinas";
    label: string;
    clusterId: string;
    tipo: "oficina";
  };
};

export const LA_VISTA_SEMBRADO_SEGMENTOS = Object.fromEntries(
  (getDesarrolloRegistry(LA_VISTA_RESIDENCIAL_ID)?.sembradoSegments ?? []).map((segment) => [
    segment.id,
    { id: segment.id, label: segment.label, clusterId: segment.clusterId },
  ]),
) as {
  oliveto: { id: "oliveto"; label: string; clusterId: string };
  benevento: { id: "benevento"; label: string; clusterId: string };
  volterra: { id: "volterra"; label: string; clusterId: string };
};

export type PasajeSembradoSegmentoId = keyof typeof PASAJE_SEMBRADO_SEGMENTOS;
export type LaVistaSembradoSegmentoId = keyof typeof LA_VISTA_SEMBRADO_SEGMENTOS;
