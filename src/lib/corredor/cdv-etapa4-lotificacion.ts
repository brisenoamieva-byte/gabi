import { CDV_SEMBRADO_RESUMEN } from "./cdv-sembrado-analisis";

/**
 * Lotificación Etapa 4 — VoBo Investti (plano ARVT_2).
 * Fuente: CDV_VoBo_Lot_Etapa4- ARVT_2-Model.pdf
 *
 * El PDF es un plano CAD (1 lámina). No incluye tabla de superficies por lote en texto;
 * los metrajes se infieren de cotas lineales y se contrastan con la recomendación BBR.
 */

export const CDV_ETAPA4_LOTIFICACION_FUENTE =
  "Plano VoBo lotificación Etapa 4 Cañadas del Valle (Grupo Investti · ARVT_2-Model)";

export const CDV_ETAPA4_LOTIFICACION_PDF = "/corredor/cdv-etapa4-vobo-lotificacion.pdf";

/** Cotas típicas de frente / fondo extraídas del plano (m). */
export const CDV_ETAPA4_COTAS_M = {
  frenteMin: 7.5,
  frenteMax: 15.4,
  fondoMin: 18.2,
  fondoMax: 34.5,
  frenteMediana: 9.9,
  fondoMediana: 23.5,
} as const;

/** Estimación por pares frente×fondo compatibles en cotas del plano (referencia, no catastral). */
export const CDV_ETAPA4_METRAJE_ESTIMADO = {
  minM2: 129,
  maxM2: 460,
  medianaM2: 253,
  /** Pares frente×fondo plausibles en cotas del plano */
  paresAnalizados: 37,
  pctEn220_260: 30,
  pctEn200_280: 43,
  pctBajo200: 22,
  pctSobre280: 35,
} as const;

export const CDV_ETAPA4_PLANO = {
  etapa: 4,
  vialidad: "Vialidad Etapa 4 (continuidad con Etapa 1)",
  numeracionMax: "L-81",
  /** Anotaciones de conteo visibles en manzanas del plano */
  manzanasAnotadas: [94, 82, 67, 65, 60, 53, 41, 32, 25, 22, 14, 8] as const,
  sectores: [
    "Valle de la Libertad",
    "Valle de los Reyes",
    "Valle Alegre",
    "Valle del Éxito",
    "Valle de la Amistad",
    "Valle Verde",
    "Paseo Cañadas del Valle",
    "Paseo Valle Posada",
  ],
  /** Polígono con superficie explícita en plano (m²) */
  superficieAnotadaM2: 14288.19,
} as const;

export type AlineacionLotificacion = {
  nivel: "alta" | "parcial";
  titulo: string;
  resumen: string;
  puntos: string[];
  observaciones: string[];
};

export function evaluarAlineacionEtapa4(
  recomendadoMin: number,
  recomendadoMax: number,
): AlineacionLotificacion {
  const e = CDV_ETAPA4_METRAJE_ESTIMADO;
  const centroEnBanda =
    e.medianaM2 >= recomendadoMin && e.medianaM2 <= recomendadoMax;
  const mayorEnBanda = e.pctEn220_260 >= 25;

  return {
    nivel: centroEnBanda && mayorEnBanda ? "alta" : "parcial",
    titulo: centroEnBanda
      ? "El plano de Etapa 4 encaja con 220–260 m²"
      : "El plano de Etapa 4 requiere ajustes en los extremos",
    resumen: centroEnBanda
      ? `Con las medidas del plano VoBo, la mediana estimada es ~${e.medianaM2} m² — dentro de la propuesta ${recomendadoMin}–${recomendadoMax} m².`
      : `La mediana del plano (~${e.medianaM2} m²) cae en ${recomendadoMin}–${recomendadoMax} m², pero hay lotes fuera de ese rango que conviene revisar.`,
    puntos: [
      `Mediana estimada del plano: ~${e.medianaM2} m² (de ${e.minM2} a ${e.maxM2} m²).`,
      `~${e.pctEn220_260}% de las combinaciones medidas caen en ${recomendadoMin}–${recomendadoMax} m².`,
      CDV_ETAPA4_PLANO.vialidad,
    ],
    observaciones: [
      e.pctBajo200 >= 15
        ? `El plano incluye tramos bajo 200 m² (~${e.pctBajo200}%). En Etapa 1 aún hay ${CDV_SEMBRADO_RESUMEN.disponibles160a200} lotes libres en 160–200 m² — hay que considerar ese inventario para no sobreinventariar la nueva etapa y que las ventas se desplacen de forma equilibrada.`
        : "Pocos lotes bajo 200 m² en las medidas del plano.",
      e.pctSobre280 >= 20
        ? `También hay lotes sobre 280 m² (~${e.pctSobre280}%) — ese tamaño vende poco según el sembrado.`
        : "Pocos lotes sobre 280 m² en las medidas del plano.",
    ],
  };
}

export function getEtapa4EvidenciaRecomendacion(
  recomendadoMin: number,
  recomendadoMax: number,
): string {
  const a = evaluarAlineacionEtapa4(recomendadoMin, recomendadoMax);
  return `Plano Etapa 4 (VoBo Investti): mediana ~${CDV_ETAPA4_METRAJE_ESTIMADO.medianaM2} m² — ${a.nivel === "alta" ? "alineado" : "parcialmente alineado"} con ${recomendadoMin}–${recomendadoMax} m².`;
}
