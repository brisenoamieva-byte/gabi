"use client";

import { useCallback, useEffect, useState } from "react";
import type { PropuestaComercialMedia } from "@/lib/propuestas/vita-alta-media";
import type { PropuestaComercialData } from "@/lib/propuestas/types";
import type { ConsultoriaMarcaPresentacion } from "@/lib/brand/consultoria-marca";
import { DEFAULT_CONSULTORIA_MARCA } from "@/lib/brand/consultoria-marca";

type LoadedPropuesta = {
  propuesta: PropuestaComercialData;
  media: PropuestaComercialMedia;
  presentacionMarca: ConsultoriaMarcaPresentacion;
};

export function useResolvedPropuesta(slug: string) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: LoadedPropuesta }
    | { status: "error"; message: string }
  >({ status: "loading" });

  const load = useCallback(async () => {
    if (!slug) {
      setState({ status: "error", message: "Propuesta no encontrada." });
      return;
    }

    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/propuestas/${encodeURIComponent(slug)}`);
      const json = (await response.json()) as LoadedPropuesta & { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "No se pudo cargar la propuesta.");
      }
      setState({
        status: "ready",
        data: {
          propuesta: json.propuesta,
          media: json.media,
          presentacionMarca: json.presentacionMarca ?? DEFAULT_CONSULTORIA_MARCA,
        },
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Error al cargar",
      });
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
