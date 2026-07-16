import type { DisponibilidadUnidad } from "@/lib/data";
import { buildInventarioStorageKey } from "@/lib/offline/constants";

/** En línea, no usar cache más viejo que esto como fallback silencioso. */
export const OFFLINE_INVENTARIO_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type StoredInventario = {
  units: DisponibilidadUnidad[];
  cachedAt: string;
};

export const readOfflineInventario = (
  desarrolloId: string,
  clusterId: string,
  options?: { maxAgeMs?: number },
): DisponibilidadUnidad[] | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(buildInventarioStorageKey(desarrolloId, clusterId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredInventario;
    if (!parsed.units?.length) {
      return null;
    }

    if (options?.maxAgeMs != null && parsed.cachedAt) {
      const age = Date.now() - new Date(parsed.cachedAt).getTime();
      if (!Number.isFinite(age) || age > options.maxAgeMs) {
        return null;
      }
    }

    return parsed.units;
  } catch {
    return null;
  }
};

export const writeOfflineInventario = (
  desarrolloId: string,
  clusterId: string,
  units: DisponibilidadUnidad[],
) => {
  if (typeof window === "undefined" || !units.length) {
    return;
  }

  const payload: StoredInventario = {
    units,
    cachedAt: new Date().toISOString(),
  };
  localStorage.setItem(
    buildInventarioStorageKey(desarrolloId, clusterId),
    JSON.stringify(payload),
  );
};
