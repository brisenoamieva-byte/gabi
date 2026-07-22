import type { LeadsReporte } from "@/lib/admin/leads-reporte-service";

const escape = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const section = (title: string, rows: Array<Array<string | number>>) => {
  const lines = [`# ${title}`, ...rows.map((row) => row.map(escape).join(","))];
  return lines.join("\n");
};

export const exportLeadsReporteCsv = (
  reporte: LeadsReporte,
  meta: { desarrollo: string; desde: string; hasta: string },
) => {
  const blocks = [
    section("Resumen", [
      ["Metrica", "Valor"],
      ["Desarrollo", meta.desarrollo],
      ["Periodo", `${meta.desde} — ${meta.hasta}`],
      ["Leads totales (bruto)", reporte.totalBruto],
      ["Leads validos", reporte.total],
      ["Leads originales (validos)", reporte.total],
      ["Spam", reporte.spam],
      ["Duplicados", reporte.duplicados],
      ["Duplicados marcados spam", reporte.duplicadosSpam],
      ["Cotizaciones", reporte.cotizaciones],
      ["Calificados (Xperience)", reporte.calificacion.calificados],
      ["No calificados (Xperience)", reporte.calificacion.noCalificados],
      ["Activity score promedio", reporte.activityScore.avg ?? ""],
      ["Leads con activity score", reporte.activityScore.conScore],
      ["Perfil A", reporte.perfilAbc.a],
      ["Perfil B", reporte.perfilAbc.b],
      ["Perfil C", reporte.perfilAbc.c],
      ["Sin perfil A/B/C", reporte.perfilAbc.sin],
      ["% perfilados A/B/C", reporte.perfilAbc.perfiladosPct],
    ]),
    section("Por perfil A/B/C (post-visita)", [
      ["Perfil", "Total"],
      ...Object.entries(reporte.porPerfilAbc)
        .sort((a, b) => b[1] - a[1])
        .map(([perfil, total]) => [perfil, total]),
    ]),
    section("Activity score (bandas)", [
      ["Banda", "Total"],
      ["Alto", reporte.activityScore.porBanda.alto],
      ["Medio", reporte.activityScore.porBanda.medio],
      ["Bajo", reporte.activityScore.porBanda.bajo],
      ["Cero", reporte.activityScore.porBanda.cero],
    ]),
    section("Por calificacion Xperience (import)", [
      ["Calificacion", "Total"],
      ...Object.entries(reporte.porCalificacion)
        .sort((a, b) => b[1] - a[1])
        .map(([calificacion, total]) => [calificacion, total]),
    ]),
    section("Por campana", [
      ["Campaña", "Canal", "Total", "Validos"],
      ...reporte.porCampana.map((item) => [
        item.campanaNombre,
        item.canal ?? "",
        item.total,
        item.validos,
      ]),
    ]),
    section("Por mes", [
      ["Mes", "Total", "Validos", "Duplicados"],
      ...reporte.porMes.map((item) => [item.label, item.total, item.validos, item.duplicados]),
    ]),
    section("Por asesor", [
      ["Asesor", "Total"],
      ...reporte.porAsesor.map((item) => [item.asesorNombre, item.total]),
    ]),
    section("Motivos de descarte", [
      ["Motivo", "Total", "% de descartados"],
      ["Descartados (total)", reporte.descartadosTotal, "100"],
      ...reporte.porMotivoDescarte.map((item) => [
        item.label,
        item.total,
        item.pctDeDescartados,
      ]),
    ]),
    section("Por region", [
      ["Region", "Total"],
      ...reporte.porRegion.map((item) => [item.region, item.total]),
    ]),
    section("Por estado (Mexico)", [
      ["Estado", "Total"],
      ...reporte.porEstado.map((item) => [item.estadoNombre, item.total]),
    ]),
    section("QA y satisfaccion", [
      ["Metrica", "Valor"],
      ["Encuestas QA", reporte.qa.qaRespondidas],
      ["Promedio QA", reporte.qa.promedioQa ?? ""],
      ["Encuestas satisfaccion", reporte.qa.satisfaccionRespondidas],
      ["Promedio satisfaccion", reporte.qa.promedioSatisfaccion ?? ""],
      ["Total respuestas", reporte.qa.totalEncuestas],
    ]),
  ];

  return blocks.join("\n\n");
};

export const downloadLeadsReporteCsv = (
  reporte: LeadsReporte,
  meta: { desarrollo: string; desde: string; hasta: string },
) => {
  const csv = exportLeadsReporteCsv(reporte, meta);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reporte-leads-${meta.desarrollo}-${meta.desde}-${meta.hasta}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};
