"use client";

import { useEffect, useState } from "react";
import type { DisponibilidadUnidad } from "@/lib/data";
import {
  fetchClusterInventario,
  type ClusterInventarioSource,
} from "@/lib/inventario/cluster-inventory-client";

type ClusterInventarioState = {
  units: DisponibilidadUnidad[];
  source: ClusterInventarioSource;
  loading: boolean;
};

const emptyState: ClusterInventarioState = {
  units: [],
  source: "local",
  loading: false,
};

export function useClusterInventario(
  desarrolloId: string | undefined,
  clusterId: string | undefined,
): ClusterInventarioState {
  const [state, setState] = useState<ClusterInventarioState>(emptyState);

  useEffect(() => {
    if (!desarrolloId || !clusterId) {
      setState(emptyState);
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));

    void fetchClusterInventario(desarrolloId, clusterId).then((result) => {
      if (!cancelled) {
        setState({ ...result, loading: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [desarrolloId, clusterId]);

  return state;
}
