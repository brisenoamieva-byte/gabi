import { getDisponibilidadesByCluster, type DisponibilidadUnidad } from "@/lib/data";
import { readOfflineInventario } from "@/lib/offline/inventario-store";

export type ClusterInventarioSource = "supabase" | "local" | "offline-cache";

export type ClusterInventarioResult = {
  units: DisponibilidadUnidad[];
  source: ClusterInventarioSource;
};

export async function fetchClusterInventario(
  desarrolloId: string,
  clusterId: string,
): Promise<ClusterInventarioResult> {
  const fallback = getDisponibilidadesByCluster(clusterId);
  const offlineUnits = readOfflineInventario(desarrolloId, clusterId);

  if (typeof navigator !== "undefined" && !navigator.onLine && offlineUnits) {
    return { units: offlineUnits, source: "offline-cache" };
  }

  try {
    const params = new URLSearchParams({ desarrolloId, clusterId });
    const response = await fetch(`/api/inventario/recomendados?${params}`);
    const data = (await response.json()) as {
      productos?: DisponibilidadUnidad[];
      curated?: boolean;
    };

    if (response.ok && data.curated && data.productos?.length) {
      return { units: data.productos, source: "supabase" };
    }
  } catch {
    if (offlineUnits) {
      return { units: offlineUnits, source: "offline-cache" };
    }
  }

  if (offlineUnits) {
    return { units: offlineUnits, source: "offline-cache" };
  }

  return { units: fallback, source: "local" };
}
