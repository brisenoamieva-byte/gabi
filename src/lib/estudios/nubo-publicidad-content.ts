/** Presupuesto de publicidad NUBO · propuesta BBR (referencia modelo + propuesta comercial). */
import {
  NUBO_PUBLICIDAD_PARTIDAS_MENSUAL,
  type NuboPublicidadPartidaMensual,
} from "@/lib/estudios/nubo-publicidad-partidas";

export type { NuboPublicidadPartidaMensual as NuboPublicidadPartida };

export const NUBO_PUBLICIDAD_PARTIDAS = NUBO_PUBLICIDAD_PARTIDAS_MENSUAL;

export const NUBO_PUBLICIDAD_META = {
  num: "04",
  titulo: "Presupuesto de publicidad",
  subtitulo: "Propuesta BBR · arranque comercial",
  contexto:
    "Inversión mes a mes por concepto · calendario desde agosto 2026. Propuesta al 2.5% del valor del proyecto. Montos sujetos a afinación.",
  nota: "Modelo BBR, alineado a propuesta comercial NUBO.",
  fuenteReferencia: "Presupuesto 23sep24.xlsx",
  mesInicioLabel: "Agosto 2026",
} as const;

export const NUBO_ESCENARIO_COMERCIAL = {
  totalLotes: 100,
  mesesVenta: 25,
  absorcionMensual: 4,
  ingresoTotal: 324_328_739.49,
  ticketPromedio: 3_243_287.39,
  pctPublicidad: 0.025,
} as const;

/** Columnas de mes en tabla de presupuesto (Agosto 2026 → 30 meses). */
export const NUBO_PUBLICIDAD_MESES_PROYECCION = 30;

export const NUBO_PUBLICIDAD_RESUMEN = {
  valorProyecto: NUBO_ESCENARIO_COMERCIAL.ingresoTotal,
  pctPublicidad: NUBO_ESCENARIO_COMERCIAL.pctPublicidad,
  mesesProyeccion: NUBO_PUBLICIDAD_MESES_PROYECCION,
  mesInicio: { year: 2026, month: 8 },
  ivaPct: 0.16,
} as const;

const MESES_CORTO = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

export type NuboPublicidadColumnaMes = {
  indice: number;
  etiqueta: string;
  etiquetaCorta: string;
  /** Encabezado compacto para tablas densas (ej. Ago'26). */
  etiquetaCompacta: string;
};

export const NUBO_PUBLICIDAD_MES_COL_PX = 54;
export const NUBO_PUBLICIDAD_TOTAL_COL_PX = 58;
export const NUBO_PUBLICIDAD_CONCEPTO_COL_PX = 168;

export function getNuboPublicidadColumnasMes(
  inicio = NUBO_PUBLICIDAD_RESUMEN.mesInicio,
  cantidad = NUBO_PUBLICIDAD_RESUMEN.mesesProyeccion,
): NuboPublicidadColumnaMes[] {
  return Array.from({ length: cantidad }, (_, index) => {
    const date = new Date(inicio.year, inicio.month - 1 + index, 1);
    const mes = MESES_CORTO[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return {
      indice: index,
      etiqueta: `${mes} ${date.getFullYear()}`,
      etiquetaCorta: `${mes} ${year}`,
      etiquetaCompacta: `${mes}'${year}`,
    };
  });
}

/** Etiqueta de rango calendario (ej. Ago 2026 – Ene 2029). */
export function getNuboPublicidadRangoLabel(
  inicio = NUBO_PUBLICIDAD_RESUMEN.mesInicio,
  cantidad = NUBO_PUBLICIDAD_RESUMEN.mesesProyeccion,
): string {
  const columnas = getNuboPublicidadColumnasMes(inicio, cantidad);
  if (columnas.length === 0) return NUBO_PUBLICIDAD_META.mesInicioLabel;
  const fin = columnas[columnas.length - 1];
  return `${NUBO_PUBLICIDAD_META.mesInicioLabel} – ${fin.etiqueta}`;
}

/** Extiende arreglos legacy (12 meses) al total de columnas. */
export function padNuboPublicidadMeses(
  meses: readonly number[],
  total = NUBO_PUBLICIDAD_MESES_PROYECCION,
): number[] {
  if (meses.length >= total) {
    return meses.slice(0, total).map((m) => Math.max(0, Number(m) || 0));
  }

  const src = meses.map((m) => Math.max(0, Number(m) || 0));
  const result = [...src];
  const nonZero = src.filter((m) => m > 0);

  if (nonZero.length > 0 && src.every((m) => m === nonZero[0])) {
    while (result.length < total) result.push(nonZero[0]!);
    return result;
  }

  if (nonZero.length === 1) {
    while (result.length < total) result.push(0);
    return result;
  }

  while (result.length < total) {
    result.push(src[result.length % src.length] ?? 0);
  }
  return result;
}

export function getNuboPublicidadTotalesMensuales(
  partidas: readonly NuboPublicidadPartidaMensual[] = NUBO_PUBLICIDAD_PARTIDAS_MENSUAL,
  cantidad = NUBO_PUBLICIDAD_RESUMEN.mesesProyeccion,
): number[] {
  const totales = Array.from({ length: cantidad }, () => 0);
  for (const partida of partidas) {
    for (let i = 0; i < cantidad; i++) {
      totales[i] += partida.meses[i] ?? 0;
    }
  }
  return totales;
}

export const NUBO_PUBLICIDAD_MENSUAL = getNuboPublicidadTotalesMensuales();

export type NuboPublicidadSegmentoResumen = {
  segmento: string;
  anual: number;
  partidas: number;
};

export function getNuboPublicidadSegmentos(
  partidas: readonly NuboPublicidadPartidaMensual[] = NUBO_PUBLICIDAD_PARTIDAS_MENSUAL,
): NuboPublicidadSegmentoResumen[] {
  const map = new Map<string, { anual: number; partidas: number }>();
  for (const p of partidas) {
    const prev = map.get(p.segmento) ?? { anual: 0, partidas: 0 };
    map.set(p.segmento, {
      anual: prev.anual + p.anual,
      partidas: prev.partidas + 1,
    });
  }
  return Array.from(map.entries())
    .map(([segmento, data]) => ({ segmento, ...data }))
    .sort((a, b) => b.anual - a.anual);
}

export function getNuboPublicidadTotales(
  partidas: readonly NuboPublicidadPartidaMensual[] = NUBO_PUBLICIDAD_PARTIDAS_MENSUAL,
  ivaPct = NUBO_PUBLICIDAD_RESUMEN.ivaPct,
) {
  const subtotal = partidas.reduce((sum, p) => sum + p.anual, 0);
  const iva = subtotal * ivaPct;
  return { subtotal, iva, total: subtotal + iva };
}

export function getNuboPublicidadPresupuestoTotal(
  valorProyecto = NUBO_PUBLICIDAD_RESUMEN.valorProyecto,
) {
  return valorProyecto * NUBO_PUBLICIDAD_RESUMEN.pctPublicidad;
}

export function getNuboPublicidadInversionAnual(
  totalesMensuales: readonly number[] = NUBO_PUBLICIDAD_MENSUAL,
) {
  return totalesMensuales.reduce((sum, m) => sum + m, 0);
}

const pesoFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

/** Parsea texto con o sin signo de pesos y separadores de miles. */
export function parseMontoPresupuesto(raw: string): number {
  const n = Number(String(raw).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

/** Deja solo dígitos para guardar en inputs de dinero. */
export function normalizeMontoDigits(raw: string): string {
  return String(raw).replace(/[^\d]/g, "");
}

/** Formato con $ para inputs de dinero (vacío si no hay monto). */
export function formatMontoInput(raw: string): string {
  if (!normalizeMontoDigits(raw)) return "";
  return pesoFormatter.format(parseMontoPresupuesto(raw));
}

/** Formato compacto para celdas de tabla (siempre con signo de pesos). */
export function formatCeldaPresupuesto(monto: number): string {
  return pesoFormatter.format(Math.round(monto));
}
