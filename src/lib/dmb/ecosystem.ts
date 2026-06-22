/**
 * Módulos del cerebro DMB — consultoría, estudios y corredor sur.
 * Misma infra que gabi; marca y dominio independientes (dmb.mx).
 */

export type DmbModulo = {
  id: string;
  titulo: string;
  descripcion: string;
  href: string;
  exportable?: boolean;
  compartible?: boolean;
};

export const DMB_ECOSYSTEM: DmbModulo[] = [
  {
    id: "centro",
    titulo: "Centro DMB",
    descripcion: "Vista integral: propuestas, estudios de mercado y corredor sur.",
    href: "/dmb",
  },
  {
    id: "propuestas",
    titulo: "Propuestas comerciales",
    descripcion:
      "Paquetes B2B para desarrolladores: escenario financiero, estrategia, equipo y condiciones.",
    href: "/propuestas",
    exportable: true,
    compartible: true,
  },
  {
    id: "estudios",
    titulo: "Estudios de mercado",
    descripcion: "Análisis de preventa, competencia, demanda y pricing. Confidenciales.",
    href: "/estudios",
    exportable: true,
  },
  {
    id: "corredor",
    titulo: "Corredor sur",
    descripcion:
      "Mapa y comparativo zona sur Querétaro · acuerdos de comercialización con desarrolladores.",
    href: "/corredor",
  },
  {
    id: "admin",
    titulo: "Admin DMB",
    descripcion: "Editar propuestas, estudios NUBO y fichas del corredor.",
    href: "/admin/dmb",
  },
];

export const DMB_CONTACT = {
  email: "contacto@dmb.mx",
  phone: "442 155 6155",
  web: "dmb.mx",
} as const;
