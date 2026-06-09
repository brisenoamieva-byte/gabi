export type EstudioListItem = {
  slug: string;
  titulo: string;
  subtitulo: string;
  ubicacion: string;
  cliente: string;
  fecha: string;
  href: string;
  clasificacion: string;
};

/** Estudios de mercado privados (operador gabi). */
export const ESTUDIOS_REGISTRY: EstudioListItem[] = [
  {
    slug: "investti-cdv-metraje",
    titulo: "Cañadas del Valle · Metraje y demanda",
    subtitulo: "Nota de mercado · Inventario, apartados y estrategia de precios",
    ubicacion: "Corregidora, Querétaro",
    cliente: "Grupo Investti / BBR Habitarea",
    fecha: "2026",
    href: "/corredor/investti",
    clasificacion: "Uso interno · Comercial",
  },
];
