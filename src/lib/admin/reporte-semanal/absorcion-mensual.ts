import type { SembradoUnidadRow } from "@/lib/comercial/sembrado-status";
import type { ReporteSemanalAbsorcionMes } from "@/lib/admin/reporte-semanal/types";

const VENTA_ESTATUS = new Set(["Vendidas Cobradas"]);

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number): string {
  const labels = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const yy = String(year).slice(-2);
  return `${labels[month]}-${yy}`;
}

export function buildAbsorcionMensualSeries(
  rows: SembradoUnidadRow[],
  prospectosByMonth: Map<string, number>,
  visitasByMonth: Map<string, number>,
  clusterDeptos?: string,
  clusterOficinas?: string,
  monthsBack = 18,
): ReporteSemanalAbsorcionMes[] {
  const now = new Date();
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

  return series;
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
