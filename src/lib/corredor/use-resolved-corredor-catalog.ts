"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CorredorDesarrollo } from "@/lib/corredor/types";
import { CORREDOR_DESARROLLOS } from "@/lib/corredor/zona-sur-seed";

type CatalogMeta = {
  updatedAt: string;
  origin: "static" | "supabase";
  overrideCount: number;
};

export function useResolvedCorredorCatalog() {
  const [desarrollos, setDesarrollos] = useState<CorredorDesarrollo[]>(CORREDOR_DESARROLLOS);
  const [meta, setMeta] = useState<CatalogMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/corredor/catalog");
      const json = (await response.json()) as {
        desarrollos?: CorredorDesarrollo[];
        meta?: CatalogMeta;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "No se pudo cargar el corredor.");
      }
      if (json.desarrollos?.length) {
        setDesarrollos(json.desarrollos);
      }
      if (json.meta) {
        setMeta(json.meta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const getById = useCallback(
    (id: string) => desarrollos.find((item) => item.id === id),
    [desarrollos],
  );

  return useMemo(
    () => ({
      desarrollos,
      meta,
      loading,
      error,
      reload: load,
      getById,
    }),
    [desarrollos, meta, loading, error, load, getById],
  );
}
