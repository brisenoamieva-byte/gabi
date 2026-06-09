/**
 * Análisis del sembrado Cañadas del Valle v.4 (Control Gerencia Investti).
 * Fuente: Sembrado Cañadas del Valle v.4.xlsx — hoja Sembrado, 495 lotes con dato.
 *
 * Los agregados por rango se calculan desde CDV_SEMBRADO_RANGOS para evitar
 * inconsistencias entre dashboard, recomendación y gráficas.
 */

export type CdvRangoAbsorcion = {
  rango: string;
  minM2: number;
  maxM2: number;
  vendidosYApartados: number;
  disponibles: number;
  /** % de ventas+apartados que caen en este rango */
  pctDemanda: number;
  /** Sell-through: vendidos+apart / (vendidos+apart+disponibles) */
  sellThrough: number;
};

export const CDV_SEMBRADO_FUENTE =
  "Sembrado Cañadas del Valle v.4 — Control Gerencia Investti";

/** Conteos de cabecera del sembrado (hoja Sembrado). */
const CDV_SEMBRADO_CABECERA = {
  totalConDato: 495,
  vendidas: 309,
  vendidasCobradas: 217,
  listaParaCobro: 92,
  apartados: 38,
  disponibles: 143,
  medianaVentaM2: 190.3,
  medianaApartadoM2: 224.7,
  medianaDisponibleM2: 176.0,
  promedioVentaM2: 206.0,
} as const;

export const CDV_SEMBRADO_RANGOS: CdvRangoAbsorcion[] = [
  {
    rango: "160–180",
    minM2: 160,
    maxM2: 180,
    vendidosYApartados: 128,
    disponibles: 97,
    pctDemanda: 36.9,
    sellThrough: 0.57,
  },
  {
    rango: "180–200",
    minM2: 180,
    maxM2: 200,
    vendidosYApartados: 59,
    disponibles: 20,
    pctDemanda: 17.0,
    sellThrough: 0.75,
  },
  {
    rango: "200–220",
    minM2: 200,
    maxM2: 220,
    vendidosYApartados: 27,
    disponibles: 2,
    pctDemanda: 7.8,
    sellThrough: 0.93,
  },
  {
    rango: "220–250",
    minM2: 220,
    maxM2: 250,
    vendidosYApartados: 68,
    disponibles: 19,
    pctDemanda: 19.6,
    sellThrough: 0.78,
  },
  {
    rango: "250–280",
    minM2: 250,
    maxM2: 280,
    vendidosYApartados: 36,
    disponibles: 4,
    pctDemanda: 10.4,
    sellThrough: 0.9,
  },
  {
    rango: "280–320",
    minM2: 280,
    maxM2: 320,
    vendidosYApartados: 22,
    disponibles: 1,
    pctDemanda: 6.3,
    sellThrough: 0.96,
  },
  {
    rango: "320–400",
    minM2: 320,
    maxM2: 400,
    vendidosYApartados: 5,
    disponibles: 0,
    pctDemanda: 1.4,
    sellThrough: 1,
  },
  {
    rango: "400–550",
    minM2: 400,
    maxM2: 550,
    vendidosYApartados: 2,
    disponibles: 0,
    pctDemanda: 0.6,
    sellThrough: 1,
  },
];

/** Buckets totalmente contenidos en [minM2, maxM2] (p. ej. 200–250 → 200–220 + 220–250). */
export function sumarBucketsContenidos(
  minM2: number,
  maxM2: number,
): { vendidosYApartados: number; disponibles: number } {
  return CDV_SEMBRADO_RANGOS.reduce(
    (acc, r) => {
      if (r.minM2 >= minM2 && r.maxM2 <= maxM2) {
        return {
          vendidosYApartados: acc.vendidosYApartados + r.vendidosYApartados,
          disponibles: acc.disponibles + r.disponibles,
        };
      }
      return acc;
    },
    { vendidosYApartados: 0, disponibles: 0 },
  );
}

/** Buckets con tope ≤ maxM2 (p. ej. bajo 250 m² incluye el bucket 220–250). */
function sumarBucketsHasta(maxM2: number) {
  return CDV_SEMBRADO_RANGOS.reduce(
    (acc, r) => {
      if (r.maxM2 <= maxM2) {
        return {
          vendidosYApartados: acc.vendidosYApartados + r.vendidosYApartados,
          disponibles: acc.disponibles + r.disponibles,
        };
      }
      return acc;
    },
    { vendidosYApartados: 0, disponibles: 0 },
  );
}

function sumarBucketsDesde(minM2: number) {
  return CDV_SEMBRADO_RANGOS.reduce(
    (acc, r) => {
      if (r.minM2 >= minM2) {
        return {
          vendidosYApartados: acc.vendidosYApartados + r.vendidosYApartados,
          disponibles: acc.disponibles + r.disponibles,
        };
      }
      return acc;
    },
    { vendidosYApartados: 0, disponibles: 0 },
  );
}

function sumarBucketsPorRango(...rangos: string[]) {
  const set = new Set(rangos);
  return CDV_SEMBRADO_RANGOS.reduce(
    (acc, r) => {
      if (!set.has(r.rango)) return acc;
      return {
        vendidosYApartados: acc.vendidosYApartados + r.vendidosYApartados,
        disponibles: acc.disponibles + r.disponibles,
      };
    },
    { vendidosYApartados: 0, disponibles: 0 },
  );
}

function buildResumen() {
  const a200_250 = sumarBucketsContenidos(200, 250);
  const a160_200 = sumarBucketsContenidos(160, 200);
  const a220_280 = sumarBucketsContenidos(220, 280);
  const a280_400 = sumarBucketsContenidos(280, 400);
  const aSobre280 = sumarBucketsDesde(280);
  const aSobre320 = sumarBucketsPorRango("320–400", "400–550");
  const aBajo250 = sumarBucketsHasta(250);
  const a250oMas = sumarBucketsDesde(250);
  const totalDemanda = CDV_SEMBRADO_RANGOS.reduce((s, r) => s + r.vendidosYApartados, 0);
  const pctBajo250 = Math.round((aBajo250.vendidosYApartados / totalDemanda) * 1000) / 10;

  return {
    ...CDV_SEMBRADO_CABECERA,
    pctDemandaBajo250: pctBajo250,
    pctDemanda250oMas: Math.round((100 - pctBajo250) * 10) / 10,
    disponiblesBajo250: aBajo250.disponibles,
    disponibles250oMas: a250oMas.disponibles,
    demanda200a250: a200_250.vendidosYApartados,
    disponibles200a250: a200_250.disponibles,
    disponibles160a200: a160_200.disponibles,
    demanda220a280: a220_280.vendidosYApartados,
    disponibles220a280: a220_280.disponibles,
    demanda280a400: a280_400.vendidosYApartados,
    disponibles280a400: a280_400.disponibles,
    demandaSobre280: aSobre280.vendidosYApartados,
    demandaSobre320: aSobre320.vendidosYApartados,
    /**
     * Histórico en buckets 220–250 + 250–280 (franja que atiende la propuesta 220–260 m²).
     * El bucket 250–280 cubre lotes vendidos entre 251–280 m².
     */
    demandaEnPropuesta: a220_280.vendidosYApartados,
    disponiblesEnPropuesta: a220_280.disponibles,
    totalVendidosYApartados: CDV_SEMBRADO_RANGOS.reduce(
      (s, r) => s + r.vendidosYApartados,
      0,
    ),
    totalDisponiblesRangos: CDV_SEMBRADO_RANGOS.reduce((s, r) => s + r.disponibles, 0),
  };
}

export const CDV_SEMBRADO_RESUMEN = buildResumen();

/** Sell-through mín/máx en buckets contenidos en [min, max] m². */
export function sellThroughEnRango(minM2: number, maxM2: number): { min: number; max: number } {
  const sts = CDV_SEMBRADO_RANGOS.filter(
    (r) => r.minM2 >= minM2 && r.maxM2 <= maxM2,
  ).map((r) => r.sellThrough);
  return {
    min: Math.round(Math.min(...sts) * 100),
    max: Math.round(Math.max(...sts) * 100),
  };
}

export function getCdvSembradoConclusiones(): string[] {
  const r = CDV_SEMBRADO_RESUMEN;
  const st200_250 = sellThroughEnRango(200, 250);
  return [
    `${r.vendidas} ventas y ${r.apartados} apartados; lo vendido tiene mediana de ${r.medianaVentaM2} m².`,
    `Quedan ${r.disponibles} lotes libres — ${r.disponiblesBajo250} son menores de 250 m².`,
    `En 200–250 m² ya se vendió o apartó el ${st200_250.min}–${st200_250.max}% del inventario de ese tramo; quedan ${r.disponibles200a250} lotes.`,
    `Los apartados activos tienen mediana de ${r.medianaApartadoM2} m².`,
    `Arriba de 280 m² hubo pocas ventas (${r.demandaSobre280} en total).`,
    "La nueva etapa en 220–260 m² repone inventario donde casi no queda stock, con ticket de mercado y sin duplicar los lotes chicos que aún tenemos en 160–200 m².",
  ];
}
