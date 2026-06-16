"use client";

import { useEffect, useState } from "react";
import {
  getDefaultNuboEstudioContenido,
  getDefaultNuboEstudioMedia,
} from "@/lib/estudios/nubo-estudio-defaults";
import type {
  NuboEstudioContenido,
  NuboEstudioMedia,
  NuboEstudioPublishMeta,
} from "@/lib/estudios/nubo-estudio-types";

export function useNuboEstudioPresentation() {
  const [contenido, setContenido] = useState<NuboEstudioContenido>(() =>
    getDefaultNuboEstudioContenido(),
  );
  const [media, setMedia] = useState<NuboEstudioMedia>(() => getDefaultNuboEstudioMedia());
  const [publishMeta, setPublishMeta] = useState<NuboEstudioPublishMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/estudios/nubo/contenido", { cache: "no-store" });
        const data = (await res.json()) as {
          contenido?: NuboEstudioContenido;
          media?: NuboEstudioMedia;
          meta?: NuboEstudioPublishMeta;
          error?: string;
        };
        if (!cancelled) {
          if (!res.ok) {
            setLoadError(data.error ?? "No se pudo cargar el estudio publicado.");
            return;
          }
          if (data.contenido) setContenido(data.contenido);
          if (data.media) setMedia(data.media);
          setPublishMeta(data.meta ?? null);
        }
      } catch {
        if (!cancelled) setLoadError("No se pudo cargar el estudio publicado.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { contenido, media, publishMeta, loading, loadError };
}
