import type { DesarrolloComplianceReport } from "@/lib/comercial/crm-compliance-service";
import { prospectoEtapaLabel } from "@/lib/comercial/prospecto-etapas";

const escapeCsvCell = (value: string) => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const exportComplianceExceptionsCsv = (report: DesarrolloComplianceReport) => {
  const headers = [
    "Prospecto",
    "Asesor",
    "Etapa",
    "Estado",
    "Paso",
    "Confianza %",
    "Excluido embudo",
    "Prospecto ID",
  ];

  const rows = report.exceptions.map((row) => {
    const issue = row.issues[0];
    const estado =
      issue?.status === "overdue"
        ? `Vencido (${Math.round(issue.hoursOverdue)}h)`
        : issue
          ? "Pendiente"
          : "";

    return [
      row.nombre,
      row.asesorNombre ?? "",
      prospectoEtapaLabel[row.etapa],
      estado,
      issue?.stepLabel ?? "",
      String(row.confidencePct),
      row.excludedFromPipeline ? "Sí" : "No",
      row.prospectoId,
    ].map((cell) => escapeCsvCell(cell));
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
};
