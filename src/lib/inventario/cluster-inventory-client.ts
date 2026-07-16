import { enrichPasajeInventario } from "@/lib/catalog/pasaje-unidad-detalles";
import { getDisponibilidadesByCluster, type DisponibilidadUnidad } from "@/lib/data";
import { filterUnidadesEtapaVendible } from "@/lib/inventario/sembrado-cotizable";
import {
  OFFLINE_INVENTARIO_MAX_AGE_MS,
  readOfflineInventario,
} from "@/lib/offline/inventario-store";

export type ClusterInventarioSource = "sembrado" | "supabase" | "local" | "offline-cache";

export type ClusterInventarioResult = {
  units: DisponibilidadUnidad[];
  source: ClusterInventarioSource;
};

const normalizeUnits = (
  units: DisponibilidadUnidad[],
  desarrolloId: string,
): DisponibilidadUnidad[] =>
  filterUnidadesEtapaVendible(desarrolloId, enrichPasajeInventario(units, desarrolloId));

export async function fetchClusterInventario(
  desarrolloId: string,
  clusterId: string,
): Promise<ClusterInventarioResult> {
  const fallback = normalizeUnits(
    getDisponibilidadesByCluster(clusterId),
    desarrolloId,
  );
  const isOnline = typeof navigator === "undefined" || navigator.onLine;

  // Offline: aceptar cache aunque sea viejo (mejor stale que nada).
  // Online: solo como fallback si está fresco.
  const offlineUnits = readOfflineInventario(
    desarrolloId,
    clusterId,
    isOnline ? { maxAgeMs: OFFLINE_INVENTARIO_MAX_AGE_MS } : undefined,
  );
  const offlineNormalized = offlineUnits
    ? normalizeUnits(offlineUnits, desarrolloId)
    : undefined;

  if (!isOnline && offlineNormalized) {
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
