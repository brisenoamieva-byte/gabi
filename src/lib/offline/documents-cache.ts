import type { DocumentoTipo } from "@/lib/admin/types";
import { OFFLINE_DOCS_CACHE, buildDocumentCacheKey } from "@/lib/offline/constants";

export type DocumentCacheParams = {
  desarrolloId: string;
  tipo: DocumentoTipo;
  clusterId?: string;
  prototipoId?: string;
  etapa?: string;
};

const canUseCacheApi = () => typeof window !== "undefined" && "caches" in window;

export const cacheDocumentBlob = async (
  params: DocumentCacheParams,
  blob: Blob,
  filename: string,
) => {
  if (!canUseCacheApi()) {
    return;
  }

  const cache = await caches.open(OFFLINE_DOCS_CACHE);
  const key = buildDocumentCacheKey(params);
  const response = new Response(blob, {
    headers: {
      "Content-Type": blob.type || "application/pdf",
      "X-Gabi-Filename": filename,
    },
  });
  try {
    await cache.put(key, response);
  } catch {
    // Cache API only accepts http(s) URLs; download must still succeed if caching fails.
  }
};

export const readCachedDocument = async (
  params: DocumentCacheParams,
): Promise<{ blob: Blob; filename: string } | null> => {
  if (!canUseCacheApi()) {
    return null;
  }

  const cache = await caches.open(OFFLINE_DOCS_CACHE);
  const key = buildDocumentCacheKey(params);
  const response = await cache.match(key);

  if (!response) {
    return null;
  }

  const filename = response.headers.get("X-Gabi-Filename") ?? "documento.pdf";
  const blob = await response.blob();
  return { blob, filename };
};

export const triggerBlobDownload = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};
