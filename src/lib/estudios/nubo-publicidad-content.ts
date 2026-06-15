/** Presupuesto de publicidad NUBO · propuesta BBR (referencia modelo + propuesta comercial). */
import {
  NUBO_PUBLICIDAD_PARTIDAS_MENSUAL,
  type NuboPublicidadPartidaMensual,
} from "@/lib/estudios/nubo-publicidad-partidas";

export type { NuboPublicidadPartidaMensual as NuboPublicidadPartida };

export const NUBO_PUBLICIDAD_PARTIDAS = NUBO_PUBLICIDAD_PARTIDAS_MENSUAL;

export const NUBO_PUBLICIDAD_META = {
  num: "05",
  titulo: "Presupuesto de publicidad",
  subtitulo: "Propuesta BBR · arranque comercial",
  contexto:
    "Inversión mes a mes por concepto · calendario desde agosto 2026. Propuesta al 2.5% del valor del proyecto. Montos sujetos a afinación.",
  nota: "Modelo BBR (referencia Puerta Allende · sep 2024), alineado a propuesta comercial NUBO.",
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

export const NUBO_PUBLICIDAD_RESUMEN = {
  valorProyecto: NUBO_ESCENARIO_COMERCIAL.ingresoTotal,
  pctPublicidad: NUBO_ESCENARIO_COMERCIAL.pctPublicidad,
  mesesProyeccion: 12,
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
};

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
    };
  });
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

/** Formato compacto para celdas de tabla ($ sin decimales; guión si es cero). */
export function formatCeldaPresupuesto(monto: number): string {
  if (monto === 0) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(monto));
}
