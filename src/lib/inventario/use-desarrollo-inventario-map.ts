"use client";

import { useEffect, useMemo, useState } from "react";
import type { DisponibilidadUnidad } from "@/lib/data";
import { getDisponibilidadesByCluster } from "@/lib/data";
import { fetchClusterInventario } from "@/lib/inventario/cluster-inventory-client";

type InventarioMapState = {
  byCluster: Record<string, DisponibilidadUnidad[]>;
  loading: boolean;
};

const emptyState: InventarioMapState = { byCluster: {}, loading: false };

/** Inventario sembrado por cluster — una sola fuente para filtros de recorrido/cotizador. */
export function useDesarrolloInventarioMap(
  desarrolloId: string | undefined,
  clusterIds: string[],
) {
  const [state, setState] = useState<InventarioMapState>(emptyState);
  const clusterKey = clusterIds.join("|");

  useEffect(() => {
    const ids = clusterKey ? clusterKey.split("|").filter(Boolean) : [];
    if (!desarrolloId || !ids.length) {
      setState(emptyState);
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));

    void Promise.all(
      ids.map(async (clusterId) => {
        const result = await fetchClusterInventario(desarrolloId, clusterId);
        return [clusterId, result.units] as const;
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      setState({
        byCluster: Object.fromEntries(entries),
        loading: false,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [clusterKey, desarrolloId]);

  const getClusterInventario = useMemo(
    () =>
      (clusterId: string): DisponibilidadUnidad[] => {
        const remote = state.byCluster[clusterId];
        if (remote !== undefined) {
          return remote;
        }
        return getDisponibilidadesByCluster(clusterId);
      },
    [state.byCluster],
  );

  return { inventarioByCluster: state.byCluster, getClusterInventario, loading: state.loading };
}
