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
    subtitulo: "Propuesta 220–260 m² · sembrado y corredor sur",
    ubicacion: "Corregidora, Querétaro",
    cliente: "Grupo Investti / BBR Habitarea",
    fecha: "2026",
    href: "/corredor/investti",
    clasificacion: "DMB · Análisis de mercado",
  },
  {
    slug: "nubo-preventa",
    titulo: "NUBO · Condiciones para preventa",
    subtitulo: "Infraestructura + publicidad 2.5%",
    ubicacion: "San Miguel de Allende, Guanajuato",
    cliente: "Desarrollador NUBO / BBR Habitarea",
    fecha: "2026",
    href: "/estudios/nubo",
    clasificacion: "DMB · Consultoría comercial",
  },
];
