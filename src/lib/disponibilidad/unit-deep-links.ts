/** Deep-links desde Disponibilidad hacia Cotizador / Recorrido con unidad preseleccionada. */

export type DisponibilidadDeepLinkRow = {
  unidadId: string;
  unidad: string;
  clusterId: string;
  prototipoId?: string | null;
};

export function cotizadorHrefForUnidad(row: DisponibilidadDeepLinkRow): string {
  const params = new URLSearchParams({
    unidadId: row.unidadId,
    unidad: row.unidad,
  });
  if (row.clusterId) {
    params.set("clusterId", row.clusterId);
  }
  if (row.prototipoId) {
    params.set("prototipoId", row.prototipoId);
  }
  return `/cotizador?${params.toString()}`;
}

export function recorridoHrefForUnidad(row: DisponibilidadDeepLinkRow): string {
  const params = new URLSearchParams({
    unidadId: row.unidadId,
  });
  if (row.clusterId) {
    params.set("clusterId", row.clusterId);
  }
  if (row.prototipoId) {
    params.set("prototipoId", row.prototipoId);
  }
  return `/recorrido?${params.toString()}`;
}
