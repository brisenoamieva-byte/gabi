/**
 * Material visual del análisis de preventa NUBO.
 * Planos oficiales del desarrollador + referencias de concepto.
 */
const BASE = "/propuestas/nubo";
const ANALISIS = `${BASE}/analisis`;

export const NUBO_ANALISIS_MEDIA = {
  /** Master plan del proyecto (layout Residencial, Village, Rancho, etc.) */
  masterPlan: `${ANALISIS}/master-plan-proyecto.png`,
  /** Polígono en Google Earth con pins: zona arbolada, hotel, acceso */
  ubicacionSitio: `${ANALISIS}/ubicacion-sitio.png`,
  /** Hotel Hacienda Taboada — fotografía actual en sitio */
  hotelTaboadaActual: `${ANALISIS}/hotel-taboada-actual.png`,
  /** Look & feel restaurante campestre — referencia Plantado */
  restauranteLookAndFeel: [
    {
      src: `${ANALISIS}/restaurante-ref-plantado-1.png`,
      nombre: "Plantado",
      detalle: "Palapa sobre espejo de agua, terrazas bajo árbol y comedor al aire libre.",
    },
    {
      src: `${ANALISIS}/restaurante-ref-plantado-2.png`,
      nombre: "Plantado",
      detalle: "Lámparas artesanales, muebles naturales y terraza nocturna bajo follaje.",
    },
  ] as const,
  /** Referencias de accesos premium en otros desarrollos */
  accesosRef: [
    {
      src: `${ANALISIS}/acceso-ref-la-ceiba.png`,
      nombre: "La Ceiba",
      detalle: "Piedra, madera, iluminación y caseta integrada — acceso construido que transmite nivel desde la vía.",
    },
    {
      src: `${ANALISIS}/acceso-ref-lago-juriquilla.png`,
      nombre: "Lago de Juriquilla",
      detalle: "Escala monumental, materiales nobles y espejo de agua — referencia de impacto visual en la llegada.",
    },
  ] as const,
} as const;
