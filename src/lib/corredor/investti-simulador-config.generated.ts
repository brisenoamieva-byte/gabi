/* eslint-disable */
export const INVESTTI_SIMULADOR_CONFIG = {
  "generatedAt": "2026-06-10T18:51:48.135Z",
  "source": "Simulador Master Investti 4feb25 (26).xlsm",
  "interestAnual": 0.12,
  "apartadoDefault": 50000,
  "descuentosEsquemaPct": {
    "contado": 0.0899,
    "m6": 0.06078994337268717,
    "m12": 0.04090999147584562,
    "m18": 0.020646449482791707,
    "m24": 0,
    "m36": -0.042437540346608404,
    "m48": -0.08639180451239925,
    "m60": -0.131847790372845,
    "m72": -0.25846215128266503,
    "libre": -0.03270530357144197
  },
  "esquemas": [
    {
      "id": "contado",
      "label": "CONTADO",
      "enganchePct": 1,
      "engancheDiferidoMeses": 0,
      "plazoMeses": 0
    },
    {
      "id": "m6",
      "label": "6 meses",
      "enganchePct": 0.3,
      "engancheDiferidoMeses": 1,
      "plazoMeses": 6
    },
    {
      "id": "m12",
      "label": "12 meses",
      "enganchePct": 0.3,
      "engancheDiferidoMeses": 1,
      "plazoMeses": 12
    },
    {
      "id": "m18",
      "label": "18 meses",
      "enganchePct": 0.3,
      "engancheDiferidoMeses": 1,
      "plazoMeses": 18
    },
    {
      "id": "m24",
      "label": "24 meses",
      "enganchePct": 0.3,
      "engancheDiferidoMeses": 1,
      "plazoMeses": 24
    },
    {
      "id": "m36",
      "label": "36 meses",
      "enganchePct": 0.3,
      "engancheDiferidoMeses": 1,
      "plazoMeses": 36
    },
    {
      "id": "m48",
      "label": "48 meses",
      "enganchePct": 0.3,
      "engancheDiferidoMeses": 1,
      "plazoMeses": 48
    },
    {
      "id": "m60",
      "label": "60 meses",
      "enganchePct": 0.3,
      "engancheDiferidoMeses": 1,
      "plazoMeses": 60
    },
    {
      "id": "m72",
      "label": "72 meses",
      "enganchePct": 0.15,
      "engancheDiferidoMeses": 3,
      "plazoMeses": 72
    },
    {
      "id": "libre",
      "label": "LIBRE",
      "enganchePct": 0.15,
      "engancheDiferidoMeses": 3,
      "plazoMeses": 23
    }
  ],
  "desarrolloSlug": {
    "Cañadas_del_Valle": "canadas-del-valle",
    "Cañadas_del_Arroyo": "canadas-del-arroyo",
    "Simaté": "simate",
    "Cañadas_La_Porta": "canadas-la-porta"
  },
  "slugDesarrollo": {
    "canadas-del-valle": "Cañadas_del_Valle",
    "canadas-del-arroyo": "Cañadas_del_Arroyo",
    "simate": "Simaté",
    "canadas-la-porta": "Cañadas_La_Porta"
  },
  "stats": {
    "lotes": 1429,
    "byDev": {
      "Cañadas_del_Valle": 491,
      "Cañadas_La_Porta": 94,
      "Simaté": 312,
      "Cañadas_del_Arroyo": 532
    }
  },
  "reglas": {
    "canadas-del-valle": {
      "engancheMinPct": 0.15,
      "plazoMaxMeses": 60,
      "mensualidadMinima": 7000,
      "apartado": 15000
    },
    "canadas-del-arroyo": {
      "engancheMinPct": 0.15,
      "plazoMaxMeses": 48,
      "mensualidadMinima": 7000,
      "apartado": 15000
    },
    "simate": {
      "engancheMinPct": 0.2,
      "plazoMaxMeses": 36,
      "mensualidadMinima": 15000,
      "apartado": 30000
    },
    "canadas-la-porta": {
      "engancheMinPct": 0.3,
      "plazoMaxMeses": 36,
      "mensualidadMinima": 15000,
      "apartado": 50000
    }
  }
} as const;
