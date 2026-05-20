import { filterDesarrollosForAdmin, getAdminScopeLabel } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import {
  getClustersForDesarrolloIds,
  getPrototiposForDesarrolloIds,
  listActiveDesarrollos,
} from "@/lib/catalog/service";
import {
  disponibilidades as fallbackDisponibilidades,
  type Cluster,
  type Desarrollo,
  type DisponibilidadUnidad,
  type Prototipo,
} from "@/lib/data";

export type AdminCatalogContext = {
  activeDesarrollos: Desarrollo[];
  allowedDesarrollos: Desarrollo[];
  desarrolloNames: Record<string, string>;
  scopeLabel: string;
  clusters: Cluster[];
  prototipos: Prototipo[];
  disponibilidades: DisponibilidadUnidad[];
};

export const getAdminCatalogContext = async (
  profile: AdminProfile,
): Promise<AdminCatalogContext> => {
  const activeDesarrollos = await listActiveDesarrollos();
  const allowedDesarrollos = filterDesarrollosForAdmin(activeDesarrollos, profile);
  const allowedIds = allowedDesarrollos.map((item) => item.id);
  const desarrolloNames = Object.fromEntries(
    activeDesarrollos.map((item) => [item.id, item.nombre]),
  );

  const [clusters, prototipos] = await Promise.all([
    getClustersForDesarrolloIds(allowedIds),
    getPrototiposForDesarrolloIds(allowedIds),
  ]);

  const activeClusters = clusters.filter((item) => item.activo);
  const clusterIds = new Set(activeClusters.map((item) => item.id));
  const disponibilidades = fallbackDisponibilidades.filter((item) =>
    clusterIds.has(item.clusterId),
  );

  return {
    activeDesarrollos,
    allowedDesarrollos,
    desarrolloNames,
    scopeLabel: getAdminScopeLabel(profile, desarrolloNames),
    clusters: activeClusters,
    prototipos: prototipos.filter((item) => item.activo),
    disponibilidades,
  };
};
