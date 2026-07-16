export const ESTATUS_SEMBRADO = [
  "Disponibles",
  "Apartado",
  "Asignado",
  "Bloqueado",
  "Vendido Cobrado 1er Parte",
  "Vendidas listas para cobro",
  "Vendidas en espera de cobro",
  "Vendidas Cobradas",
  "Vendidas Desarrollador",
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
    case "Vendidas Desarrollador":
      return "vendido";
    case "Bloqueado":
    case "Asignado":
    case "Cancelado":
      return "bloqueado";
    default:
      return "disponible";
  }
};

export const operacionTieneCliente = (estatus: string) =>
  estatus !== "Disponibles" &&
  estatus !== "Asignado" &&
  estatus !== "Bloqueado" &&
  estatus !== "Cancelado";

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
  Cancelado: "Cancelado",
  "Vendido Cobrado 1er Parte": "Vendido (1er cobro)",
  "Vendidas listas para cobro": "Lista para cobro",
  "Vendidas en espera de cobro": "En espera de cobro",
  "Vendidas Cobradas": "Vendida cobrada",
  "Vendidas Desarrollador": "Vendida desarrollador",
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
  origen_captacion?: string | null;
  equipo_venta: string | null;
  promotor_nombre: string | null;
  tipo_inversion: string | null;
  lista_precios: string | null;
  lista_precios_id?: string | null;
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
  contrato_firmado?: boolean;
  contrato_firmado_at?: string | null;
  cancelada: boolean;
  cancelada_at: string | null;
  comprobacion: number | null;
  enganche_cubierto?: boolean;
  enganche_cubierto_at?: string | null;
  enganche_cubierto_por?: string | null;
  persona_moral?: boolean;
  cliente_kyc?: import("@/lib/comercial/expediente-oferta-types").ClienteKycDatos | null;
  plan_pago?: import("@/lib/comercial/expediente-oferta-types").PlanPagoDatos | null;
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
  origen_captacion?: string | null;
  medio_contacto: string | null;
  medio_publicitario: string | null;
  asesor_id: string | null;
  promotor_nombre: string | null;
  equipo_venta: string | null;
  tipo_inversion: string | null;
  edad?: number | null;
  sexo?: string | null;
  ocupacion?: string | null;
  etapa: string;
  notas: string | null;
  visita_id: string | null;
  campana_id: string | null;
  partner_id: string | null;
  xperience_id: number | null;
  producto_nombre: string | null;
  calificacion: string | null;
  nivel_interes: string | null;
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
  visita_agendada_on: string | null;
  visita_realizada_on: string | null;
  perfil_presupuesto_disponible: boolean | null;
  perfil_intencion_apartar: boolean | null;
  perfil_decisor_visita: boolean | null;
  perfil_vio_publicidad_redes: boolean | null;
  perfil_calificacion_lead: string | null;
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
export const LA_VISTA_RESIDENCIAL_ID = "la-vista-residencial";

export {
  PASAJE_SEMBRADO_SEGMENTOS,
  LA_VISTA_SEMBRADO_SEGMENTOS,
  type PasajeSembradoSegmentoId,
  type LaVistaSembradoSegmentoId,
} from "@/lib/catalog/desarrollos-registry";

export type SembradoUnidadRow = {
  unidadId: string;
  unidad: string;
  tipo: string;
  clusterId: string;
  listaPrecios: string | null;
  precio: number | null;
  prototipoId: string | null;
  superficieTerrenoM2: number | null;
  superficieConstruccionM2: number | null;
  etapa: string | null;
  orden: number;
  visitable: boolean;
  prioridadComercial: "alta" | "media" | "baja";
  razonesVenta: string[];
  ubicacionComercial: string | null;
  instruccionRecorrido: string | null;
  notaAcceso: string | null;
  estatusInventario: InventarioEstatus;
  entregado: boolean;
  escriturado: boolean;
  operacion: OperacionComercialRecord | null;
  totalCobrado: number;
};

export type UnidadCuracionInput = {
  precio?: number | null;
  prototipoId?: string | null;
  superficieTerrenoM2?: number | null;
  superficieConstruccionM2?: number | null;
  etapa?: string | null;
  orden?: number;
  visitable?: boolean;
  prioridadComercial?: "alta" | "media" | "baja";
  razonesVenta?: string[];
  ubicacionComercial?: string | null;
  instruccionRecorrido?: string | null;
  notaAcceso?: string | null;
};
