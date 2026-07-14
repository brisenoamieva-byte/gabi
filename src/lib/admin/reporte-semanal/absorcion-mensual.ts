import type { SembradoUnidadRow } from "@/lib/comercial/sembrado-status";
import type { ReporteSemanalAbsorcionMes } from "@/lib/admin/reporte-semanal/types";

const VENTA_ESTATUS = new Set(["Vendidas Cobradas"]);

/** Ventana por defecto solo si aún no hay ningún dato (proyecto vacío). */
const FALLBACK_MONTHS_BACK = 6;
const MAX_MONTHS_BACK = 36;

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number): string {
  const labels = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const yy = String(year).slice(-2);
  return `${labels[month]}-${yy}`;
}

function isActiveMonth(point: ReporteSemanalAbsorcionMes): boolean {
  return (
    point.apartadosDeptos > 0 ||
    point.apartadosOficinas > 0 ||
    point.afluencia > 0 ||
    point.citasVisitas > 0
  );
}

/** Quita meses vacíos al inicio para no mostrar periodos anteriores al proyecto. */
export function trimLeadingEmptyAbsorcion(
  series: ReporteSemanalAbsorcionMes[],
): ReporteSemanalAbsorcionMes[] {
  const firstIdx = series.findIndex(isActiveMonth);
  if (firstIdx <= 0) return series;
  return series.slice(firstIdx);
}

/**
 * Meses a mostrar: desde el primer mes con afluencia/visitas/apartados hasta hoy.
 * No rellena meses vacíos anteriores al arranque del proyecto.
 */
export function resolveAbsorcionMonthsBack(
  prospectosByMonth: Map<string, number>,
  visitasByMonth: Map<string, number>,
  rows: SembradoUnidadRow[],
  now = new Date(),
): number {
  const candidates: string[] = [];
  const consider = (key: string | null | undefined) => {
    if (!key || !/^\d{4}-\d{2}$/.test(key)) return;
    candidates.push(key);
  };

  for (const [key, count] of Array.from(prospectosByMonth.entries())) {
    if (count > 0) consider(key);
  }
  for (const [key, count] of Array.from(visitasByMonth.entries())) {
    if (count > 0) consider(key);
  }
  for (const row of rows) {
    const fa = row.operacion?.fecha_apartado?.slice(0, 7);
    if (fa && !row.operacion?.cancelada) consider(fa);
  }

  if (!candidates.length) {
    return FALLBACK_MONTHS_BACK;
  }

  const earliest = candidates.reduce((min, key) => (key < min ? key : min));
  const [year, month] = earliest.split("-").map(Number);
  const months =
    (now.getUTCFullYear() - year) * 12 + (now.getUTCMonth() + 1 - month) + 1;

  return Math.min(MAX_MONTHS_BACK, Math.max(1, months));
}

export function buildAbsorcionMensualSeries(
  rows: SembradoUnidadRow[],
  prospectosByMonth: Map<string, number>,
  visitasByMonth: Map<string, number>,
  clusterDeptos?: string,
  clusterOficinas?: string,
  monthsBack = FALLBACK_MONTHS_BACK,
  now = new Date(),
): ReporteSemanalAbsorcionMes[] {
  const series: ReporteSemanalAbsorcionMes[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = monthKey(d.getUTCFullYear(), d.getUTCMonth());
    const mesStart = `${key}-01`;
    const mesEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10);

    let apartadosDeptos = 0;
    let apartadosOficinas = 0;

    for (const row of rows) {
      const op = row.operacion;
      if (!op?.fecha_apartado || op.cancelada) continue;
      const fa = op.fecha_apartado.slice(0, 10);
      if (fa < mesStart || fa > mesEnd) continue;
      if (clusterDeptos && row.clusterId === clusterDeptos) apartadosDeptos += 1;
      else if (clusterOficinas && row.clusterId === clusterOficinas) apartadosOficinas += 1;
      else if (!clusterDeptos && !clusterOficinas) {
        apartadosDeptos += 1;
      }
    }

    series.push({
      mes: monthLabel(d.getUTCFullYear(), d.getUTCMonth()),
      mesKey: key,
      apartadosDeptos,
      apartadosOficinas,
      afluencia: prospectosByMonth.get(key) ?? 0,
      citasVisitas: visitasByMonth.get(key) ?? 0,
    });
  }

  return trimLeadingEmptyAbsorcion(series);
}

export function countVentasEnMes(rows: SembradoUnidadRow[], mesStart: string, mesEnd: string): number {
  let count = 0;
  for (const row of rows) {
    const op = row.operacion;
    if (!op?.fecha_cierre || op.cancelada || !VENTA_ESTATUS.has(op.estatus_sembrado)) continue;
    const fc = op.fecha_cierre.slice(0, 10);
    if (fc >= mesStart && fc <= mesEnd) count += 1;
  }
  return count;
}
