import type { Cluster } from "@/lib/data";

/** Clusters del desarrollo seleccionado, sin duplicados por id ni por nombre de producto. */
export const filterClustersByDesarrollo = (
  clusters: Cluster[],
  desarrolloId: string,
): Cluster[] => {
  if (!desarrolloId) {
    return [];
  }

  const byId = new Map<string, Cluster>();
  for (const cluster of clusters) {
    if (!cluster.activo || cluster.desarrolloId !== desarrolloId) {
      continue;
    }
    if (!byId.has(cluster.id)) {
      byId.set(cluster.id, cluster);
    }
  }

  const byNombre = new Map<string, Cluster>();
  for (const cluster of Array.from(byId.values())) {
    const key = cluster.nombre.trim().toLowerCase();
    if (!byNombre.has(key)) {
      byNombre.set(key, cluster);
    }
  }

  return Array.from(byNombre.values());
};
