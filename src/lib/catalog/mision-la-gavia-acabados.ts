/** Acabados y equipamiento de departamentos — Misión La Gavia. */

export type MisionLaGaviaAcabadosSection = {
  title: string;
  items: string[];
};

const ROOF_ACABADO = "Roof con pérgola, medio baño y tarja";
const ROOF_SECTION_TITLE = "Roof";

/** Lista comercial para recorrido / cotizador (sin roof; se agrega solo en modelos con roof). */
export const MISION_LA_GAVIA_DEPTOS_ACABADOS: string[] = [
  "Muro de tabique tipo Novaceramic",
  "Sistema de losa vigueta y bovedilla",
  "Preparación para A/C en recámara principal y sala-comedor",
  "Preparación para 2 paneles solares",
  "Tanque estacionario de 180 L con carga a pie de edificio",
  "Cocina: barra de granito, estufa, campana, tarja doble y monomando",
  "Closet piso a techo en cada recámara",
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

/** Detalle agrupado para consulta en campo (sin sección Roof). */
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
];

const ROOF_SECTION: MisionLaGaviaAcabadosSection = {
  title: ROOF_SECTION_TITLE,
  items: ["Pérgola, medio baño y tarja"],
};

/** Bullets compactos (resúmenes / PDF). */
export const MISION_LA_GAVIA_DEPTOS_ACABADOS_RESUMEN: string[] = [
  "Tabique Novaceramic · losa vigueta y bovedilla · yeso / aplanado",
  "Pisos de mármol · ventanas aluminio · cancelería baños vidrio templado",
  "Cocina con barra de granito, estufa, campana y tarja doble",
  "Closets piso a techo · prep. A/C y 2 paneles solares · tanque 180 L · cisterna y tinaco",
];

const ROOF_RESUMEN = "Roof con pérgola, medio baño y tarja";

export const isMisionLaGaviaDepartamentosCluster = (
  clusterId?: string | null,
): boolean => clusterId?.startsWith("mision-la-gavia-departamentos") ?? false;

/** True en modelos de segundo nivel / roof garden. */
export const misionLaGaviaPrototipoHasRoof = (input: {
  id?: string;
  nombre?: string;
  slug?: string;
}): boolean => {
  const text = `${input.slug ?? ""} ${input.nombre ?? ""} ${input.id ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    text.includes("roof") ||
    text.includes("segundo") ||
    text.includes("nivel-03") ||
    /(?:^|-)03(?:-|$)/.test(text)
  );
};

export const getMisionLaGaviaDeptosAcabados = (options?: { includeRoof?: boolean }) => {
  const includeRoof = options?.includeRoof === true;
  return {
    incluido: includeRoof
      ? [
          ...MISION_LA_GAVIA_DEPTOS_ACABADOS.slice(0, 7),
          ROOF_ACABADO,
          ...MISION_LA_GAVIA_DEPTOS_ACABADOS.slice(7),
        ]
      : MISION_LA_GAVIA_DEPTOS_ACABADOS,
    noIncluye: MISION_LA_GAVIA_DEPTOS_NO_INCLUYE,
    sections: includeRoof
      ? [...MISION_LA_GAVIA_DEPTOS_ACABADOS_SECTIONS, ROOF_SECTION]
      : MISION_LA_GAVIA_DEPTOS_ACABADOS_SECTIONS,
    resumen: includeRoof
      ? [...MISION_LA_GAVIA_DEPTOS_ACABADOS_RESUMEN, ROOF_RESUMEN]
      : MISION_LA_GAVIA_DEPTOS_ACABADOS_RESUMEN,
  };
};
