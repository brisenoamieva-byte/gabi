export const LISTA_PRECIOS_ESTADOS = ["borrador", "activa", "cerrada"] as const;
export type ListaPreciosEstado = (typeof LISTA_PRECIOS_ESTADOS)[number];

export type ListaPreciosRecord = {
  id: string;
  desarrollo_id: string;
  nombre: string;
  codigo: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  estado: ListaPreciosEstado;
  incremento_pct: number | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type ListaPreciosUnidadRecord = {
  id: string;
  lista_id: string;
  unidad_id: string;
  precio_lista: number;
  created_at: string;
  updated_at: string;
  unidad?: string | null;
  tipo?: string | null;
  estatusInventario?: string | null;
};

export type ListaPreciosDetail = ListaPreciosRecord & {
  unidades: ListaPreciosUnidadRecord[];
  unidadesCount: number;
};

export type ListaPrecioPreviewRow = {
  unidadId: string;
  unidad: string;
  tipo: string | null;
  precioActual: number;
  precioNuevo: number;
};

export const listaPreciosEstadoLabel: Record<ListaPreciosEstado, string> = {
  borrador: "Borrador",
  activa: "Activa",
  cerrada: "Cerrada",
};
