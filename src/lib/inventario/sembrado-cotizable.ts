import { listSembradoUnidades } from "@/lib/admin/operaciones-service";
import type { SembradoUnidadRow } from "@/lib/comercial/sembrado-status";
import type { DisponibilidadUnidad } from "@/lib/data";

/** Unidad cotizable = sin operación activa y estatus inventario disponible (sembrado). */
export function isUnidadCotizableSembrado(row: SembradoUnidadRow): boolean {
  if (row.operacion && !row.operacion.cancelada) {
    return false;
  }
  return row.estatusInventario === "disponible";
}

export function mapSembradoRowToDisponibilidadUnidad(row: SembradoUnidadRow): DisponibilidadUnidad {
  const m2 =
    row.superficieConstruccionM2 ??
    row.superficieTerrenoM2 ??
    undefined;

  return {
    id: row.unidadId,
    clusterId: row.clusterId,
    unidad: row.unidad,
    tipo: row.tipo as DisponibilidadUnidad["tipo"],
    estatus: "disponible",
    prototipoId: row.prototipoId ?? undefined,
    precio: row.precio ?? undefined,
    superficieTerrenoM2: row.superficieTerrenoM2 ?? undefined,
    superficieConstruccionM2: row.superficieConstruccionM2 ?? undefined,
    superficieM2: m2,
    etapa: row.etapa ?? undefined,
    orden: row.orden,
    visitable: row.visitable,
    prioridadComercial: row.prioridadComercial,
    razonesVenta: row.razonesVenta,
    ubicacionComercial: row.ubicacionComercial ?? undefined,
    instruccionRecorrido: row.instruccionRecorrido ?? undefined,
    notaAcceso: row.notaAcceso ?? undefined,
    x: 0,
    y: 0,
  };
}

export async function listUnidadesCotizablesSembrado(
  desarrolloId: string,
  clusterId?: string,
): Promise<DisponibilidadUnidad[]> {
  const rows = await listSembradoUnidades({ desarrolloId, clusterId });
  return rows.filter(isUnidadCotizableSembrado).map(mapSembradoRowToDisponibilidadUnidad);
}
