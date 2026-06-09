/** AUTO-GENERADO — scripts/generate-investti-sembrado-promedios.mjs */
/** Promedio de m² de todos los lotes con dato en sembrado (vendido + apartado + disponible). */

export const INVESTTI_SEMBRADO_METRAJE_PROMEDIO: Record<string, number> = {
  "canadas-del-arroyo": 178,
  "simate": 228
};

export const INVESTTI_SEMBRADO_METRAJE_FUENTE: Record<string, string> = {
  "canadas-del-arroyo": "Sembrado 4ta Sección Cañadas del Arroyo 01/06/2026 — Control Gerencia Investti",
  "simate": "Sembrado Simaté 2025 — Control Gerencia Investti"
};

export const INVESTTI_SEMBRADO_METRAJE_DETALLE = {
  "canadas-del-arroyo": {
    "nombre": "Cañadas del Arroyo",
    "totalLotes": 532,
    "promedioSembradoM2": 178,
    "minM2": 157.9,
    "maxM2": 342.2
  },
  "simate": {
    "nombre": "Simaté",
    "totalLotes": 317,
    "promedioSembradoM2": 228,
    "minM2": 170,
    "maxM2": 1279
  }
} as const;
