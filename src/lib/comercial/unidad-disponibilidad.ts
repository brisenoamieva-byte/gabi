import type { OperacionComercialRecord } from "@/lib/comercial/sembrado-status";
import { sembradoToInventarioEstatus, type InventarioEstatus } from "@/lib/comercial/sembrado-status";
import type { ProductoRecomendadoRecord } from "@/lib/inventario/productos-recomendados";

const INVENTARIO_ESTATUS = new Set<InventarioEstatus>([
  "disponible",
  "apartado",
  "vendido",
  "bloqueado",
]);

export const resolveUnidadEstatus = (
  unitEstatus: string,
  operacion: Pick<OperacionComercialRecord, "estatus_sembrado"> | null,
): InventarioEstatus => {
  if (operacion?.estatus_sembrado) {
    return sembradoToInventarioEstatus(operacion.estatus_sembrado);
  }
  if (INVENTARIO_ESTATUS.has(unitEstatus as InventarioEstatus)) {
    return unitEstatus as InventarioEstatus;
  }
  return "disponible";
};

export const applyOperacionEstatusToUnidad = (
  row: ProductoRecomendadoRecord,
  operacion: OperacionComercialRecord | null,
): ProductoRecomendadoRecord => ({
  ...row,
  estatus: resolveUnidadEstatus(row.estatus, operacion),
});
