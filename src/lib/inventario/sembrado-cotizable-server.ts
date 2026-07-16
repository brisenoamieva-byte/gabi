import { listSembradoUnidades } from "@/lib/admin/operaciones-service";
import type { DisponibilidadUnidad } from "@/lib/data";
import {
  isUnidadCotizableSembrado,
  isUnidadEnEtapaVendible,
  mapSembradoRowToDisponibilidadUnidad,
} from "@/lib/inventario/sembrado-cotizable";

/** Server-only: lista unidades cotizables desde sembrado (no importar desde client components). */
export async function listUnidadesCotizablesSembrado(
  desarrolloId: string,
  clusterId?: string,
): Promise<DisponibilidadUnidad[]> {
  const rows = await listSembradoUnidades({ desarrolloId, clusterId });
  return rows
    .filter(isUnidadCotizableSembrado)
    .filter((row) => isUnidadEnEtapaVendible(desarrolloId, row.unidad))
    .map(mapSembradoRowToDisponibilidadUnidad);
}
