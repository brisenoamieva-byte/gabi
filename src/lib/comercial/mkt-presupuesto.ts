/** Segmentos default del presupuesto de publicidad (plantilla La Gavia). */
export const MKT_PRESUPUESTO_SEGMENTOS = [
  "Campaña Digital",
  "Eventos y prospección",
  "Herramientas",
  "Oficina y equipo comercial",
  "Mobiliario",
  "Señaletica",
  "Otros",
] as const;

export type MktPresupuestoSegmento = (typeof MKT_PRESUPUESTO_SEGMENTOS)[number];

export type MktPartidaTipo = "fijo" | "variable";
export type MktGastoEstatus = "pendiente" | "pagada" | "cancelada";

export type MktPresupuestoRecord = {
  id: string;
  desarrollo_id: string;
  anio: number;
  monto_autorizado: number;
  moneda: string;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type MktPartidaRecord = {
  id: string;
  presupuesto_id: string;
  desarrollo_id: string;
  segmento: string;
  proveedor: string | null;
  concepto: string;
  tipo: MktPartidaTipo;
  cantidad: number;
  monto_autorizado: number;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type MktGastoRecord = {
  id: string;
  desarrollo_id: string;
  presupuesto_id: string | null;
  partida_id: string | null;
  campana_id: string | null;
  fecha_registro: string;
  fecha_factura: string | null;
  fecha_pago: string | null;
  proveedor: string;
  descripcion: string;
  factura_ref: string | null;
  monto_sin_iva: number;
  iva: number;
  total: number;
  estatus: MktGastoEstatus;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
};

export type MktPresupuestoResumen = {
  desarrolloId: string;
  anio: number;
  presupuestoId: string | null;
  autorizado: number;
  erogado: number;
  pendientePago: number;
  pagado: number;
  remanente: number;
  pctEjercido: number | null;
  partidasCount: number;
  gastosCount: number;
};

export type MktEficienciaPeriodo = {
  desarrolloId: string;
  desde: string;
  hasta: string;
  erogado: number;
  apartadosPeriodo: number;
  ventasPeriodo: number;
  costoPorApartado: number | null;
  costoPorVenta: number | null;
};

export const isMktGastoEstatus = (value: string): value is MktGastoEstatus =>
  value === "pendiente" || value === "pagada" || value === "cancelada";

export const isMktPartidaTipo = (value: string): value is MktPartidaTipo =>
  value === "fijo" || value === "variable";

export const computeMktRemanente = (autorizado: number, erogado: number) => autorizado - erogado;

export const computeMktPctEjercido = (autorizado: number, erogado: number): number | null => {
  if (autorizado <= 0) return null;
  return Math.round((erogado / autorizado) * 1000) / 10;
};

export const computeCostoUnitario = (erogado: number, unidades: number): number | null => {
  if (unidades <= 0) return null;
  return Math.round((erogado / unidades) * 100) / 100;
};
