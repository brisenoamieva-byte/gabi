import { isMisionLaGaviaDesarrollo } from "@/lib/catalog/mision-la-gavia";
import type { SembradoUnidadRow } from "@/lib/comercial/sembrado-status";
import type { DisponibilidadUnidad } from "@/lib/data";
import {
  decodeMisionLaGaviaUnidad,
  isGaviaEdificioCotizable,
} from "@/lib/disponibilidad/planos/mision-la-gavia";

/** Unidad cotizable = sin operación activa y estatus inventario disponible (sembrado). */
export function isUnidadCotizableSembrado(row: SembradoUnidadRow): boolean {
  if (row.operacion && !row.operacion.cancelada) {
    return false;
  }
  return row.estatusInventario === "disponible";
}

/**
 * En Misión La Gavia solo se cotizan/venden edificios marcados `cotizable`
 * (etapa comercial abierta). Alineado a plano y simulador.
 */
export function isUnidadEnEtapaVendible(
  desarrolloId: string,
  unidadCodigo: string,
): boolean {
  if (!isMisionLaGaviaDesarrollo(desarrolloId)) {
    return true;
  }
  const decoded = decodeMisionLaGaviaUnidad(unidadCodigo);
  if (!decoded) {
    return false;
  }
  return isGaviaEdificioCotizable(decoded.edificio);
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

/** Filtra inventario ya mapeado a la etapa/edificio vendible del desarrollo. */
export function filterUnidadesEtapaVendible(
  desarrolloId: string,
  units: DisponibilidadUnidad[],
): DisponibilidadUnidad[] {
  return units.filter((unit) => isUnidadEnEtapaVendible(desarrolloId, unit.unidad));
}
