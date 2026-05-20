export const OFFLINE_DOCS_CACHE = "gabi-offline-docs-v1";
export const OFFLINE_META_KEY = "gabi_offline_meta";
export const OFFLINE_INVENTARIO_PREFIX = "gabi_offline_inventario_";

export type OfflinePreparedMeta = {
  desarrolloId: string;
  desarrolloNombre: string;
  preparedAt: string;
  routesCached: number;
  documentsCached: number;
  documentsFailed: number;
  inventarioClusters: number;
  assetsCached: number;
  errors: string[];
};

export const buildDocumentCacheKey = (params: {
  desarrolloId: string;
  tipo: string;
  clusterId?: string;
  prototipoId?: string;
  etapa?: string;
}) => {
  const parts = [
    params.desarrolloId,
    params.tipo,
    params.clusterId ?? "",
    params.prototipoId ?? "",
    params.etapa ?? "",
  ];
  return `gabi-doc://${parts.join("/")}`;
};

export const buildInventarioStorageKey = (desarrolloId: string, clusterId: string) =>
  `${OFFLINE_INVENTARIO_PREFIX}${desarrolloId}_${clusterId}`;
