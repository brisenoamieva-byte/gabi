/** Acabados y equipamiento de departamentos — Misión La Gavia. */

export type MisionLaGaviaAcabadosSection = {
  title: string;
  items: string[];
};

/** Lista comercial para recorrido / cotizador. */
export const MISION_LA_GAVIA_DEPTOS_ACABADOS: string[] = [
  "Muro de tabique tipo Novaceramic",
  "Sistema de losa vigueta y bovedilla",
  "Preparación para A/C en recámara principal y sala-comedor",
  "Preparación para 2 paneles solares",
  "Tanque estacionario de 180 L con carga a pie de edificio",
  "Cocina: barra de granito, estufa, campana, tarja doble y monomando",
  "Closet piso a techo en cada recámara",
  "Roof con pérgola, medio baño y tarja",
  "Cisterna y tinaco",
  "Yeso en interiores",
  "Aplanado en exterior",
  "Ventanas de aluminio",
  "Pisos de mármol",
  "Cancelería de baños en vidrio templado",
];

export const MISION_LA_GAVIA_DEPTOS_NO_INCLUYE: string[] = [
  "Equipos de aire acondicionado (solo preparación)",
  "Paneles solares (solo preparación)",
];

/** Detalle agrupado para consulta en campo. */
export const MISION_LA_GAVIA_DEPTOS_ACABADOS_SECTIONS: MisionLaGaviaAcabadosSection[] = [
  {
    title: "Estructura y muros",
    items: [
      "Muro de tabique tipo Novaceramic",
      "Sistema de losa vigueta y bovedilla",
      "Yeso en interiores",
      "Aplanado en exterior",
    ],
  },
  {
    title: "Pisos, ventanas y baños",
    items: [
      "Pisos de mármol",
      "Ventanas de aluminio",
      "Cancelería de baños en vidrio templado",
    ],
  },
  {
    title: "Cocina y closets",
    items: [
      "Barra de granito, estufa, campana, tarja doble y monomando",
      "Closet piso a techo en cada recámara",
    ],
  },
  {
    title: "Instalaciones",
    items: [
      "Preparación para A/C en recámara principal y sala-comedor",
      "Preparación para 2 paneles solares",
      "Tanque estacionario de 180 L con carga a pie de edificio",
      "Cisterna y tinaco",
    ],
  },
  {
    title: "Roof",
    items: ["Pérgola, medio baño y tarja"],
  },
];

/** Bullets compactos (resúmenes / PDF). */
export const MISION_LA_GAVIA_DEPTOS_ACABADOS_RESUMEN: string[] = [
  "Tabique Novaceramic · losa vigueta y bovedilla · yeso / aplanado",
  "Pisos de mármol · ventanas aluminio · cancelería baños vidrio templado",
  "Cocina con barra de granito, estufa, campana y tarja doble",
  "Closets piso a techo · prep. A/C y 2 paneles solares · tanque 180 L",
  "Roof con pérgola, medio baño y tarja · cisterna y tinaco",
];

export const isMisionLaGaviaDepartamentosCluster = (
  clusterId?: string | null,
): boolean => clusterId?.startsWith("mision-la-gavia-departamentos") ?? false;

export const getMisionLaGaviaDeptosAcabados = () => ({
  incluido: MISION_LA_GAVIA_DEPTOS_ACABADOS,
  noIncluye: MISION_LA_GAVIA_DEPTOS_NO_INCLUYE,
  sections: MISION_LA_GAVIA_DEPTOS_ACABADOS_SECTIONS,
  resumen: MISION_LA_GAVIA_DEPTOS_ACABADOS_RESUMEN,
});
