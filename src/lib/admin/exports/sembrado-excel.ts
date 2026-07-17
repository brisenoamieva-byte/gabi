import type { OperacionComercialRecord, SembradoUnidadRow } from "@/lib/comercial/sembrado-status";
import type { ExcelSheetSpec } from "@/lib/admin/excel-export";

export type CobranzaExportRow = {
  id: string;
  operacion_id: string;
  mes: string;
  monto: number;
  created_at?: string;
};

export const sembradoToExcelSheets = (input: {
  unidades: SembradoUnidadRow[];
  operaciones: OperacionComercialRecord[];
  cobranza: CobranzaExportRow[];
}): ExcelSheetSpec[] => {
  const unidades: ExcelSheetSpec = {
    name: "unidades",
    headers: [
      "unidad_id",
      "unidad",
      "tipo",
      "cluster_id",
      "prototipo_id",
      "lista_precios",
      "precio",
      "superficie_terreno_m2",
      "superficie_construccion_m2",
      "etapa",
      "estatus_inventario",
      "entregado",
      "escriturado",
      "operacion_id",
      "estatus_sembrado",
      "cliente_nombre",
      "total_cobrado",
    ],
    rows: input.unidades.map((row) => ({
      unidad_id: row.unidadId,
      unidad: row.unidad,
      tipo: row.tipo,
      cluster_id: row.clusterId,
      prototipo_id: row.prototipoId,
      lista_precios: row.listaPrecios,
      precio: row.precio,
      superficie_terreno_m2: row.superficieTerrenoM2,
      superficie_construccion_m2: row.superficieConstruccionM2,
      etapa: row.etapa,
      estatus_inventario: row.estatusInventario,
      entregado: row.entregado,
      escriturado: row.escriturado,
      operacion_id: row.operacion?.id ?? null,
      estatus_sembrado: row.operacion?.estatus_sembrado ?? null,
      cliente_nombre: row.operacion?.cliente_nombre ?? null,
      total_cobrado: row.totalCobrado,
    })),
  };

  const operaciones: ExcelSheetSpec = {
    name: "operaciones",
    headers: [
      "id",
      "desarrollo_id",
      "unidad_id",
      "prospecto_id",
      "cotizacion_id",
      "estatus_sembrado",
      "cliente_nombre",
      "origen_ciudad",
      "origen_captacion",
      "equipo_venta",
      "promotor_nombre",
      "tipo_inversion",
      "lista_precios",
      "lista_precios_id",
      "precio_lista",
      "descuento_pct",
      "precio_venta",
      "esquema_pago",
      "fecha_apartado",
      "fecha_cierre",
      "medio_publicitario",
      "observaciones_pagos",
      "observaciones",
      "entregado",
      "escriturado",
      "contrato_firmado",
      "cancelada",
      "cancelada_at",
      "cancelada_en_etapa",
      "comprobacion",
      "enganche_cubierto",
      "enganche_cubierto_at",
      "persona_moral",
      "created_at",
      "updated_at",
    ],
    rows: input.operaciones.map((op) => ({
      id: op.id,
      desarrollo_id: op.desarrollo_id,
      unidad_id: op.unidad_id,
      prospecto_id: op.prospecto_id,
      cotizacion_id: op.cotizacion_id,
      estatus_sembrado: op.estatus_sembrado,
      cliente_nombre: op.cliente_nombre,
      origen_ciudad: op.origen_ciudad,
      origen_captacion: op.origen_captacion,
      equipo_venta: op.equipo_venta,
      promotor_nombre: op.promotor_nombre,
      tipo_inversion: op.tipo_inversion,
      lista_precios: op.lista_precios,
      lista_precios_id: op.lista_precios_id,
      precio_lista: op.precio_lista,
      descuento_pct: op.descuento_pct,
      precio_venta: op.precio_venta,
      esquema_pago: op.esquema_pago,
      fecha_apartado: op.fecha_apartado,
      fecha_cierre: op.fecha_cierre,
      medio_publicitario: op.medio_publicitario,
      observaciones_pagos: op.observaciones_pagos,
      observaciones: op.observaciones,
      entregado: op.entregado,
      escriturado: op.escriturado,
      contrato_firmado: op.contrato_firmado,
      cancelada: op.cancelada,
      cancelada_at: op.cancelada_at,
      cancelada_en_etapa: op.cancelada_en_etapa,
      comprobacion: op.comprobacion,
      enganche_cubierto: op.enganche_cubierto,
      enganche_cubierto_at: op.enganche_cubierto_at,
      persona_moral: op.persona_moral,
      created_at: op.created_at,
      updated_at: op.updated_at,
    })),
  };

  const cobranza: ExcelSheetSpec = {
    name: "cobranza_mensual",
    headers: ["id", "operacion_id", "mes", "monto", "created_at"],
    rows: input.cobranza.map((row) => ({
      id: row.id,
      operacion_id: row.operacion_id,
      mes: row.mes,
      monto: row.monto,
      created_at: row.created_at ?? null,
    })),
  };

  return [unidades, operaciones, cobranza];
};
