import type { DocumentoTipo } from "@/lib/admin/types";
import {
  clusters,
  desarrollos,
  getPrototiposByCluster,
  type DisponibilidadUnidad,
} from "@/lib/data";
import { fetchClusterInventario } from "@/lib/inventario/cluster-inventory-client";
import {
  OFFLINE_META_KEY,
  type OfflinePreparedMeta,
} from "@/lib/offline/constants";
import { cacheDocumentBlob } from "@/lib/offline/documents-cache";
import { writeOfflineInventario } from "@/lib/offline/inventario-store";

export type OfflinePrepareProgress = {
  phase: string;
  done: number;
  total: number;
};

type DocumentJob = {
  tipo: DocumentoTipo;
  clusterId?: string;
  prototipoId?: string;
  etapa?: string;
  label: string;
};

const ROUTES_TO_PREFETCH = ["/dashboard", "/recorrido", "/cotizador", "/desarrollos"];

const resolveDocumentoUrl = async (params: {
  desarrolloId: string;
  tipo: DocumentoTipo;
  clusterId?: string;
  prototipoId?: string;
  etapa?: string;
}) => {
  const search = new URLSearchParams({
    desarrolloId: params.desarrolloId,
    tipo: params.tipo,
  });
  if (params.clusterId) {
    search.set("clusterId", params.clusterId);
  }
  if (params.prototipoId) {
    search.set("prototipoId", params.prototipoId);
  }
  if (params.etapa) {
    search.set("etapa", params.etapa);
  }

  const response = await fetch(`/api/documentos/resolve?${search.toString()}`);
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    url?: string | null;
    filename?: string;
  };

  if (!data.url) {
    return null;
  }

  return { url: data.url, filename: data.filename ?? "documento.pdf" };
};

const buildDocumentJobs = (): DocumentJob[] => {
  const jobs: DocumentJob[] = [
    {
      tipo: "brochure_desarrollo",
      label: "Brochure del desarrollo",
    },
  ];

  clusters.forEach((cluster) => {
    jobs.push({
      tipo: "brochure_cluster",
      clusterId: cluster.id,
      label: `Brochure · ${cluster.nombre}`,
    });
    jobs.push({
      tipo: "disponibilidad",
      clusterId: cluster.id,
      label: `Disponibilidad · ${cluster.nombre}`,
    });

    getPrototiposByCluster(cluster.id).forEach((prototipo) => {
      jobs.push({
        tipo: "ficha_tecnica",
        clusterId: cluster.id,
        prototipoId: prototipo.id,
        label: `Ficha · ${prototipo.nombre}`,
      });
    });
  });

  return jobs;
};

const collectAssetUrls = (desarrolloId: string) => {
  const desarrollo = desarrollos.find((item) => item.id === desarrolloId);
  const urls = new Set<string>();

  if (desarrollo?.logo) {
    urls.add(desarrollo.logo);
  }
  if (desarrollo?.desarrolladorLogo) {
    urls.add(desarrollo.desarrolladorLogo);
  }
  if (desarrollo?.masterPlanImage) {
    urls.add(desarrollo.masterPlanImage);
  }

  clusters.forEach((cluster) => {
    if (cluster.logo) {
      urls.add(cluster.logo);
    }
    if (cluster.fotoPortada) {
      urls.add(cluster.fotoPortada);
    }
    getPrototiposByCluster(cluster.id).forEach((prototipo) => {
      prototipo.planos?.forEach((url) => urls.add(url));
      prototipo.fotos?.forEach((url) => urls.add(url));
    });
  });

  try {
    const portalRaw = localStorage.getItem("gabi_portal");
    if (portalRaw) {
      const portal = JSON.parse(portalRaw) as { logo?: string };
      if (portal.logo) {
        urls.add(portal.logo);
      }
    }
  } catch {
    // Portal opcional.
  }

  return Array.from(urls);
};

export async function prepareOfflineVisit(
  desarrolloId: string,
  onProgress?: (progress: OfflinePrepareProgress) => void,
): Promise<OfflinePreparedMeta> {
  const desarrollo = desarrollos.find((item) => item.id === desarrolloId);
  if (!desarrollo) {
    throw new Error("Desarrollo no encontrado.");
  }

  const documentJobs = buildDocumentJobs();
  const assetUrls = collectAssetUrls(desarrolloId);
  const totalSteps =
    ROUTES_TO_PREFETCH.length + documentJobs.length + clusters.length + assetUrls.length;
  let done = 0;

  const report = (phase: string) => {
    onProgress?.({ phase, done, total: totalSteps });
  };

  const errors: string[] = [];
  let documentsCached = 0;
  let documentsFailed = 0;
  let inventarioClusters = 0;
  let assetsCached = 0;

  report("Precargando pantallas de la app…");
  for (const route of ROUTES_TO_PREFETCH) {
    try {
      await fetch(route, { credentials: "same-origin" });
    } catch {
      errors.push(`No se pudo precargar ${route}`);
    }
    done += 1;
    report(`Pantalla lista · ${route}`);
  }

  report("Sincronizando inventario curado…");
  for (const cluster of clusters) {
    try {
      const result = await fetchClusterInventario(desarrolloId, cluster.id);
      if (result.units.length) {
        writeOfflineInventario(desarrolloId, cluster.id, result.units);
        if (result.source === "supabase") {
          inventarioClusters += 1;
        }
      }
    } catch {
      errors.push(`Inventario no disponible · ${cluster.nombre}`);
    }
    done += 1;
    report(`Inventario · ${cluster.nombre}`);
  }

  report("Descargando documentos comerciales…");
  for (const job of documentJobs) {
    try {
      const resolved = await resolveDocumentoUrl({
        desarrolloId,
        tipo: job.tipo,
        clusterId: job.clusterId,
        prototipoId: job.prototipoId,
        etapa: job.etapa,
      });

      if (!resolved) {
        documentsFailed += 1;
        done += 1;
        report(`Sin PDF · ${job.label}`);
        continue;
      }

      const pdfResponse = await fetch(resolved.url);
      if (!pdfResponse.ok) {
        documentsFailed += 1;
        errors.push(`${job.label}: descarga fallida`);
        done += 1;
        report(`Error PDF · ${job.label}`);
        continue;
      }

      const blob = await pdfResponse.blob();
      await cacheDocumentBlob(
        {
          desarrolloId,
          tipo: job.tipo,
          clusterId: job.clusterId,
          prototipoId: job.prototipoId,
          etapa: job.etapa,
        },
        blob,
        resolved.filename,
      );
      documentsCached += 1;
    } catch {
      documentsFailed += 1;
      errors.push(`${job.label}: no se pudo guardar offline`);
    }

    done += 1;
    report(`Documento · ${job.label}`);
  }

  report("Guardando imágenes y logos…");
  for (const url of assetUrls) {
    try {
      await fetch(url);
      assetsCached += 1;
    } catch {
      errors.push(`Imagen no cacheada · ${url}`);
    }
    done += 1;
    report("Recursos visuales");
  }

  const meta: OfflinePreparedMeta = {
    desarrolloId,
    desarrolloNombre: desarrollo.nombre,
    preparedAt: new Date().toISOString(),
    routesCached: ROUTES_TO_PREFETCH.length,
    documentsCached,
    documentsFailed,
    inventarioClusters,
    assetsCached,
    errors,
  };

  localStorage.setItem(OFFLINE_META_KEY, JSON.stringify(meta));
  onProgress?.({ phase: "Listo para visita offline", done: totalSteps, total: totalSteps });

  return meta;
}

export const readOfflinePreparedMeta = (): OfflinePreparedMeta | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(OFFLINE_META_KEY);
    return raw ? (JSON.parse(raw) as OfflinePreparedMeta) : null;
  } catch {
    return null;
  }
};

export const formatOfflinePreparedAt = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

/** Precarga inventario sin UI (para reutilizar tipo). */
export type { DisponibilidadUnidad };
