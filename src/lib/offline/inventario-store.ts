import type { DisponibilidadUnidad } from "@/lib/data";
import { buildInventarioStorageKey } from "@/lib/offline/constants";

type StoredInventario = {
  units: DisponibilidadUnidad[];
  cachedAt: string;
};

export const readOfflineInventario = (
  desarrolloId: string,
  clusterId: string,
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
    return parsed.units?.length ? parsed.units : null;
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
