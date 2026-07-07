import type { DesarrolloCadenciaReport } from "@/lib/comercial/cadencia-service";

const escapeCsvCell = (value: string) => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const statusLabel: Record<string, string> = {
  active: "Activa",
  paused: "Pausada",
  completed: "Completada",
  expired: "Expirada",
};

export const exportCadenciaReportCsv = (report: DesarrolloCadenciaReport) => {
  const headers = [
    "Prospecto",
    "Asesor",
    "Estado cadencia",
    "Día",
    "Toques hechos",
    "Toques pendientes",
    "Vencidos",
    "Siguiente toque",
    "Vence",
    "Prospecto ID",
  ];

  const rows = report.prospectos.map((row) => {
    const total = row.completedTouches + row.pendingTouches;
    return [
      row.prospectoNombre,
      row.asesorNombre,
      statusLabel[row.cadenciaStatus] ?? row.cadenciaStatus,
      String(row.dayIndex),
      `${row.completedTouches}/${total}`,
      String(row.pendingTouches),
      String(row.overdueTouches),
      row.nextTouchLabel ?? "",
      row.nextTouchDueAt
        ? new Date(row.nextTouchDueAt).toLocaleString("es-MX")
        : "",
      row.prospectoId,
    ].map((cell) => escapeCsvCell(cell));
  });

  const meta = [
    "",
    `# Tasa respuesta (pausada+completada / cerradas): ${report.responseRatePct}%`,
    `# Activas: ${report.activeCount} · Expiradas: ${report.expiredCount} · Vencidos hoy: ${report.overdueTouchesTotal}`,
  ];

  return [headers.join(","), ...rows.map((row) => row.join(",")), ...meta].join("\r\n");
};
