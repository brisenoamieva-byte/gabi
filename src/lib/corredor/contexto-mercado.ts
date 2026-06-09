import type { CorredorContextoMercado } from "./types";

/** Fecha visible en dashboards ejecutivos y presentaciones. */
export const CORREDOR_DATOS_ACTUALIZADOS = "8 de junio de 2026";

export const CORREDOR_CONTEXTO: CorredorContextoMercado = {
  titulo: "Contexto de mercado — Querétaro sur",
  indicadores: [
    {
      valor: "$100 MDD",
      etiqueta: "Costco Corregidora",
      detalle: "Apertura noviembre 2026 · piso 8,000 m²",
    },
    {
      valor: "5.8%",
      etiqueta: "Crecimiento anual",
      detalle: "Corregidora — el más alto del estado",
    },
    {
      valor: "8,760",
      etiqueta: "Familias nuevas/año",
      detalle: "CEPIQ / AMPI 2026",
    },
    {
      valor: "226",
      etiqueta: "Proyectos activos",
      detalle: "Softec 2T2026",
    },
  ],
  narrativa: [
    "Nearshoring: inversión industrial sostenida empuja demanda de vivienda $2.5M–$5M.",
    "Zona sur crece hacia Huimilpan con precios 30–40% menores que el norte.",
    "Costco (nov 2026) ancla plusvalía 8–15% en radio 3–5 km.",
    "Libramiento sur-poniente: centro en ~15 min sin peaje.",
    "Rango de precios en desarrollos del corredor: $4,891–$10,150/m² (promedio ~$6,680/m²).",
    "Absorción promedio del corredor: ~5 lotes/mes. Cañadas del Valle lidera con 15/mes.",
    "Nueva etapa CDV: 220–260 m² — 104 ops. históricas (buckets 220–280), ticket ~$1.09–$1.71M.",
  ],
  fuente: "Softec DIME 2T2026, AMPI Querétaro, CEPIQ, análisis comparativo corredor sur (2026).",
};

export const AMENIDADES_TIER = {
  base: [
    "Caseta vigilancia 24/7",
    "Áreas verdes / andadores",
    "Juegos infantiles",
    "Cancha pádel",
    "Calles pavimentadas",
    "Salón usos múltiples / casa club",
  ],
  media: ["Gym al aire libre", "Área de perros", "Ciclovía / bike park", "Alberca"],
  diferenciador: [
    "Espejo de agua / lago",
    "Restaurante / área comercial",
    "Puente colgante / tirolesa",
    "Huerto urbano",
  ],
  premium: [
    "Campo de golf par 3",
    "Caballerizas / hípico",
    "Club house con alberca",
    "Senderos naturales",
  ],
} as const;

export const CORREDOR_STATS = {
  precioMinM2: 4891,
  precioMaxM2: 10_150,
  precioPromM2: 6680,
  absorcionPromMes: 5,
};
