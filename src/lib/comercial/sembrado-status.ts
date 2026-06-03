export const ESTATUS_SEMBRADO = [
  "Disponibles",
  "Apartado",
  "Asignado",
  "Bloqueado",
  "Vendido Cobrado 1er Parte",
  "Vendidas listas para cobro",
  "Vendidas en espera de cobro",
  "Vendidas Cobradas",
] as const;

export type EstatusSembrado = (typeof ESTATUS_SEMBRADO)[number];

export type InventarioEstatus = "disponible" | "apartado" | "vendido" | "bloqueado";

export const sembradoToInventarioEstatus = (estatus: string): InventarioEstatus => {
  switch (estatus) {
    case "Disponibles":
      return "disponible";
    case "Apartado":
    case "Vendido Cobrado 1er Parte":
    case "Vendidas listas para cobro":
    case "Vendidas en espera de cobro":
      return "apartado";
    case "Vendidas Cobradas":
      return "vendido";
    case "Bloqueado":
    case "Asignado":
      return "bloqueado";
    default:
      return "disponible";
  }
};

export const operacionTieneCliente = (estatus: string) =>
  estatus !== "Disponibles" && estatus !== "Asignado" && estatus !== "Bloqueado";

export const normalizeTipoInversion = (value?: string | null) => {
  if (!value?.trim()) {
    return null;
  }
  const lower = value.trim().toLowerCase();
  if (lower.includes("vivir") || lower.includes("habitar")) {
    return "vivir";
  }
  if (lower.includes("invers")) {
    return "inversion";
  }
  if (lower.includes("trabaj")) {
    return "trabajar";
  }
  return "otro";
};

export const estatusSembradoLabel: Record<string, string> = {
  Disponibles: "Disponible",
  Apartado: "Apartado",
  "Apartado pendiente": "Apartado pendiente",
  Asignado: "Asignado",
  Bloqueado: "Bloqueado",
  "Vendido Cobrado 1er Parte": "Vendido (1er cobro)",
  "Vendidas listas para cobro": "Lista para cobro",
  "Vendidas en espera de cobro": "En espera de cobro",
  "Vendidas Cobradas": "Vendida cobrada",
};

export type OperacionComercialRecord = {
  id: string;
  desarrollo_id: string;
  unidad_id: string;
  prospecto_id: string | null;
  cotizacion_id: string | null;
  estatus_sembrado: string;
  cliente_nombre: string;
  origen_ciudad: string | null;
  equipo_venta: string | null;
  promotor_nombre: string | null;
  tipo_inversion: string | null;
  lista_precios: string | null;
  precio_lista: number | null;
  descuento_pct: number | null;
  precio_venta: number | null;
  esquema_pago: string | null;
  fecha_apartado: string | null;
  fecha_cierre: string | null;
  medio_publicitario: string | null;
  observaciones_pagos: string | null;
  observaciones: string | null;
  entregado: boolean;
  escriturado: boolean;
  cancelada: boolean;
  cancelada_at: string | null;
  comprobacion: number | null;
  created_at: string;
  updated_at: string;
};

export type ProspectoRecord = {
  id: string;
  desarrollo_id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  origen_ciudad: string | null;
  medio_contacto: string | null;
  medio_publicitario: string | null;
  asesor_id: string | null;
  promotor_nombre: string | null;
  equipo_venta: string | null;
  tipo_inversion: string | null;
  etapa: string;
  notas: string | null;
  visita_id: string | null;
  campana_id: string | null;
  xperience_id: number | null;
  producto_nombre: string | null;
  calificacion: string | null;
  iscore: number | null;
  seller_score: number | null;
  asignado_por: string | null;
  bandera_correo: number;
  bandera_llamada: number;
  bandera_whatsapp: number;
  bandera_crm: number;
  es_spam: boolean;
  es_duplicado: boolean;
  adryo_url: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type CotizacionRecord = {
  id: string;
  desarrollo_id: string;
  prospecto_id: string | null;
  asesor_id: string | null;
  unidad_id: string | null;
  cluster_id: string | null;
  prototipo_id: string | null;
  unidad_numero: string | null;
  tipo_unidad: string | null;
  cliente_nombre: string | null;
  precio_lista: number | null;
  esquema_pago: string | null;
  descuento_pct: number | null;
  precio_total: number | null;
  payload: Record<string, unknown>;
  pdf_generado_at: string | null;
  created_at: string;
};

export const PASAJE_ALAMOS_ID = "pasaje-alamos";

export const PASAJE_SEMBRADO_SEGMENTOS = {
  departamentos: {
    id: "departamentos",
    label: "Departamentos",
    clusterId: "pasaje-alamos-departamentos",
    tipo: "departamento" as const,
  },
  oficinas: {
    id: "oficinas",
    label: "Oficinas",
    clusterId: "pasaje-alamos-oficinas",
    tipo: "oficina" as const,
  },
} as const;

export type PasajeSembradoSegmentoId = keyof typeof PASAJE_SEMBRADO_SEGMENTOS;

export const LA_VISTA_RESIDENCIAL_ID = "la-vista-residencial";

export const LA_VISTA_SEMBRADO_SEGMENTOS = {
  oliveto: {
    id: "oliveto",
    label: "Oliveto",
    clusterId: "oliveto",
  },
  benevento: {
    id: "benevento",
    label: "Benevento",
    clusterId: "benevento",
  },
  volterra: {
    id: "volterra",
    label: "Volterra",
    clusterId: "volterra",
  },
} as const;

export type LaVistaSembradoSegmentoId = keyof typeof LA_VISTA_SEMBRADO_SEGMENTOS;

export type SembradoUnidadRow = {
  unidadId: string;
  unidad: string;
  tipo: string;
  clusterId: string;
  listaPrecios: string | null;
  estatusInventario: InventarioEstatus;
  entregado: boolean;
  escriturado: boolean;
  operacion: OperacionComercialRecord | null;
  totalCobrado: number;
};
