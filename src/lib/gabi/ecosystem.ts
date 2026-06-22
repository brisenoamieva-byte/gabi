/**
 * Modelo lógico del ecosistema gabi — "cerebro inmobiliario".
 * Una plataforma, varias líneas de negocio y niveles de acceso.
 */

export const GABI_OPERADOR = {
  nombre: "Ricardo Briseño",
  email: "brisenoamieva@gmail.com",
} as const;

/** Líneas de negocio dentro de gabi */
export type GabiLineaNegocio =
  | "plataforma" // producto SaaS / sistema
  | "comercializadora" // operadores como BBR Habitarea
  | "inmobiliaria" // gabi Real Estate — corredor sur
  | "inteligencia"; // estudios y análisis (venta a desarrolladores)

export type GabiVisibilidad = "operador" | "comercializadora" | "compartido" | "publico";

export type GabiModulo = {
  id: string;
  linea: GabiLineaNegocio;
  titulo: string;
  descripcion: string;
  href: string;
  visibilidad: GabiVisibilidad;
  /** Exportable a PDF para venta o envío */
  exportable?: boolean;
  /** Enviar a terceros (desarrolladores) */
  compartible?: boolean;
};

/**
 * Mapa de módulos del ecosistema.
 * - operador: solo Ricardo / superadmin gabi
 * - comercializadora: equipo BBR (recorrido, CRM, etc.)
 * - compartido: link/PDF hacia desarrollador externo
 */
export const GABI_ECOSYSTEM: GabiModulo[] = [
  {
    id: "centro",
    linea: "plataforma",
    titulo: "Centro gabi",
    descripcion: "Operación comercial: recorrido, CRM, cotizador y admin.",
    href: "/gabi",
    visibilidad: "operador",
  },
  {
    id: "dmb",
    linea: "plataforma",
    titulo: "DMB · Consultoría",
    descripcion:
      "Propuestas, estudios de mercado y corredor sur — consultoría comercial (dmb.mx).",
    href: "/dmb",
    visibilidad: "operador",
  },
  {
    id: "recorrido",
    linea: "comercializadora",
    titulo: "Recorrido guiado",
    descripcion: "Guion por etapas, documentos y registro de prospecto en visita.",
    href: "/recorrido",
    visibilidad: "comercializadora",
  },
  {
    id: "cotizador",
    linea: "comercializadora",
    titulo: "Cotizador y simulador",
    descripcion: "Precios e inventario vigentes con esquemas de pago por desarrollo.",
    href: "/cotizador",
    visibilidad: "comercializadora",
  },
  {
    id: "crm",
    linea: "comercializadora",
    titulo: "CRM y campañas",
    descripcion: "Pipeline de leads, asignación y origen de campaña.",
    href: "/mis-leads",
    visibilidad: "comercializadora",
  },
  {
    id: "sembrado",
    linea: "comercializadora",
    titulo: "Sembrado e inventario",
    descripcion: "Disponibilidad real, apartados y expedientes.",
    href: "/disponibilidad",
    visibilidad: "comercializadora",
  },
  {
    id: "admin",
    linea: "plataforma",
    titulo: "Panel admin",
    descripcion: "Configuración de desarrollos, asesores, catálogo y permisos por comercializadora.",
    href: "/admin",
    visibilidad: "operador",
  },
];

export const GABI_LINEA_LABELS: Record<GabiLineaNegocio, string> = {
  plataforma: "Plataforma gabi",
  comercializadora: "Comercializadoras (BBR Habitarea)",
  inmobiliaria: "gabi Real Estate",
  inteligencia: "Inteligencia comercial",
};

export function modulosPorLinea(linea: GabiLineaNegocio): GabiModulo[] {
  return GABI_ECOSYSTEM.filter((m) => m.linea === linea);
}

export function modulosVisiblesPara(
  rol: "operador" | "comercializadora",
): GabiModulo[] {
  if (rol === "operador") {
    return GABI_ECOSYSTEM;
  }
  return GABI_ECOSYSTEM.filter((m) => m.visibilidad !== "operador");
}
