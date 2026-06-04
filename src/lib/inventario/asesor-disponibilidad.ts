import { listSembradoUnidades } from "@/lib/admin/operaciones-service";
import { estatusSembradoLabel } from "@/lib/comercial/sembrado-status";

export type AsesorDisponibilidadRow = {
  unidadId: string;
  unidad: string;
  tipo: string;
  clusterId: string;
  precio: number | null;
  listaPrecios: string | null;
  estatusSembrado: string;
  estatusLabel: string;
  visitable: boolean;
  prototipoId: string | null;
};

export const listAsesorDisponibilidad = async (
  desarrolloId: string,
  clusterId?: string,
): Promise<AsesorDisponibilidadRow[]> => {
  const rows = await listSembradoUnidades({ desarrolloId, clusterId });

  return rows.map((row) => {
    const estatusSembrado =
      row.operacion?.estatus_sembrado ??
      (row.estatusInventario === "apartado" ? "Apartado pendiente" : "Disponibles");

    return {
      unidadId: row.unidadId,
      unidad: row.unidad,
      tipo: row.tipo,
      clusterId: row.clusterId,
      precio: row.precio,
      listaPrecios: row.listaPrecios,
      estatusSembrado,
      estatusLabel: estatusSembradoLabel[estatusSembrado] ?? estatusSembrado,
      visitable: row.visitable,
      prototipoId: row.prototipoId,
    };
  });
};
