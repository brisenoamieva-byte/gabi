import type { ExpedienteListRow } from "@/lib/admin/expediente-service";
import type { ExcelSheetSpec } from "@/lib/admin/excel-export";

export const expedientesToExcelSheet = (rows: ExpedienteListRow[]): ExcelSheetSpec => ({
  name: "expedientes",
  headers: [
    "operacion_id",
    "desarrollo_id",
    "cliente_nombre",
    "unidad_numero",
    "estatus_sembrado",
    "escriturado",
    "enganche_cubierto",
    "documentos_subidos",
    "documentos_requeridos",
    "progreso_pct",
    "formalizacion_pct",
    "updated_at",
  ],
  rows: rows.map((row) => ({
    operacion_id: row.operacionId,
    desarrollo_id: row.desarrolloId,
    cliente_nombre: row.clienteNombre,
    unidad_numero: row.unidadNumero,
    estatus_sembrado: row.estatusSembrado,
    escriturado: row.escriturado,
    enganche_cubierto: row.engancheCubierto,
    documentos_subidos: row.documentosSubidos,
    documentos_requeridos: row.documentosRequeridos,
    progreso_pct: row.progresoPct,
    formalizacion_pct: row.formalizacionPct,
    updated_at: row.updatedAt,
  })),
});
