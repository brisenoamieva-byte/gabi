import { enrichPasajeInventario } from "@/lib/catalog/pasaje-unidad-detalles";
import { getDisponibilidadesByCluster, type DisponibilidadUnidad } from "@/lib/data";
import { readOfflineInventario } from "@/lib/offline/inventario-store";

export type ClusterInventarioSource = "sembrado" | "supabase" | "local" | "offline-cache";

export type ClusterInventarioResult = {
  units: DisponibilidadUnidad[];
  source: ClusterInventarioSource;
};

const normalizeUnits = (
  units: DisponibilidadUnidad[],
  desarrolloId: string,
): DisponibilidadUnidad[] => enrichPasajeInventario(units, desarrolloId);

export async function fetchClusterInventario(
  desarrolloId: string,
  clusterId: string,
): Promise<ClusterInventarioResult> {
  const fallback = normalizeUnits(
    getDisponibilidadesByCluster(clusterId),
    desarrolloId,
  );
  const offlineUnits = readOfflineInventario(desarrolloId, clusterId);
  const offlineNormalized = offlineUnits
    ? normalizeUnits(offlineUnits, desarrolloId)
    : undefined;

  if (typeof navigator !== "undefined" && !navigator.onLine && offlineNormalized) {
    return { units: offlineNormalized, source: "offline-cache" };
  }

  try {
    const params = new URLSearchParams({ desarrolloId, clusterId });
    const response = await fetch(`/api/inventario/cotizable?${params}`);
    const data = (await response.json()) as {
      productos?: DisponibilidadUnidad[];
      fuente?: string;
      error?: string;
    };

    if (response.ok && data.fuente === "sembrado") {
      return {
        units: normalizeUnits(data.productos ?? [], desarrolloId),
        source: "sembrado",
      };
    }
  } catch {
    if (offlineNormalized) {
      return { units: offlineNormalized, source: "offline-cache" };
    }
  }

  try {
    const params = new URLSearchParams({ desarrolloId, clusterId });
    const response = await fetch(`/api/inventario/recomendados?${params}`);
    const data = (await response.json()) as {
      productos?: DisponibilidadUnidad[];
      curated?: boolean;
    };

    if (response.ok && data.curated && data.productos?.length) {
      return {
        units: normalizeUnits(data.productos, desarrolloId),
        source: "supabase",
      };
    }
  } catch {
    if (offlineNormalized) {
      return { units: offlineNormalized, source: "offline-cache" };
    }
  }

  if (offlineNormalized) {
    return { units: offlineNormalized, source: "offline-cache" };
  }

  return { units: fallback, source: "local" };
}
