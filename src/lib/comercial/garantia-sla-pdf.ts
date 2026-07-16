import { jsPDF } from "jspdf";
import {
  GARANTIA_SLA_CONTRACT,
  type GarantiaSlaReport,
} from "@/lib/comercial/garantia-sla";

const INK: [number, number, number] = [19, 49, 92];
const MUTED: [number, number, number] = [100, 116, 139];
const EMERALD: [number, number, number] = [5, 150, 105];
const AMBER: [number, number, number] = [217, 119, 6];
const RED: [number, number, number] = [185, 28, 28];
const LINE: [number, number, number] = [226, 232, 240];

export type GarantiaSlaPdfInput = {
  desarrolloNombre: string;
  report: GarantiaSlaReport;
  planLabel?: string;
  contractNotes?: string;
  periodLabel?: string;
};

const sealColor = (seal: GarantiaSlaReport["seal"]): [number, number, number] => {
  if (seal === "verde") return EMERALD;
  if (seal === "riesgo") return AMBER;
  if (seal === "rojo") return RED;
  return MUTED;
};

/** Genera PDF carta (bytes) — usable en servidor (cron/email) o cliente. */
export const buildGarantiaSlaPdfBytes = (input: GarantiaSlaPdfInput): Uint8Array => {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 18;

  const planLabel = input.planLabel?.trim() || GARANTIA_SLA_CONTRACT.planLabelDefault;
  const period =
    input.periodLabel ??
    new Date(input.report.generatedAt).toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("GABI", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Reporte semanal · Garantía de seguimiento", margin + 14, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(input.desarrolloNombre, margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`${planLabel} · v${GARANTIA_SLA_CONTRACT.version}`, margin, y);
  y += 5;
  doc.text(`Periodo: ${period}`, margin, y);
  y += 10;

  const color = sealColor(input.report.seal);
  doc.setFillColor(...color);
  doc.roundedRect(margin, y, pageW - margin * 2, 18, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(input.report.sealLabel, margin + 4, y + 7);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Score ${input.report.garantiaScorePct}% · ${input.report.compliance.activeLeads} leads activos`,
    margin + 4,
    y + 13,
  );
  y += 24;

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Estado del SLA", margin, y);
  y += 6;

  for (const check of input.report.checks) {
    if (y > 240) {
      doc.addPage();
      y = 18;
    }
    doc.setDrawColor(...LINE);
    doc.line(margin, y - 2, pageW - margin, y - 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(check.label, margin, y + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const statusColor =
      check.status === "met" ? EMERALD : check.status === "at_risk" ? AMBER : RED;
    doc.setTextColor(...statusColor);
    doc.text(
      check.status === "met" ? "CUMPLE" : check.status === "at_risk" ? "RIESGO" : "INCUMPLE",
      pageW - margin - 28,
      y + 3,
    );
    y += 7;
    doc.setTextColor(...MUTED);
    doc.text(`Meta ${check.targetLabel} · Actual ${check.actualLabel}`, margin, y);
    y += 5;
    const promiseLines = doc.splitTextToSize(check.promise, pageW - margin * 2);
    doc.text(promiseLines, margin, y);
    y += promiseLines.length * 4 + 4;
  }

  y += 4;
  if (y > 200) {
    doc.addPage();
    y = 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Contrato operativo (resumen)", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  for (const clause of GARANTIA_SLA_CONTRACT.clauses) {
    const lines = doc.splitTextToSize(`• ${clause}`, pageW - margin * 2);
    if (y + lines.length * 3.5 > 270) {
      doc.addPage();
      y = 18;
    }
    doc.text(lines, margin, y);
    y += lines.length * 3.5 + 2;
  }

  if (input.contractNotes?.trim()) {
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text("Notas del desarrollo", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const noteLines = doc.splitTextToSize(input.contractNotes.trim(), pageW - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 3.5 + 4;
  }

  if (input.report.topExceptions.length && y < 250) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text("Excepciones prioritarias", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    for (const row of input.report.topExceptions.slice(0, 8)) {
      const issue = row.issues[0];
      const line = `${row.nombre} · ${row.asesorNombre ?? "Sin asesor"} · ${
        issue?.status === "overdue" ? "Vencido" : "Pendiente"
      }: ${issue?.stepLabel ?? "—"}`;
      const wrapped = doc.splitTextToSize(line, pageW - margin * 2);
      if (y + wrapped.length * 3.5 > 275) break;
      doc.text(wrapped, margin, y);
      y += wrapped.length * 3.5 + 1;
    }
  }

  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    `Generado ${new Date(input.report.generatedAt).toLocaleString("es-MX")} · gabi.mx`,
    margin,
    doc.internal.pageSize.getHeight() - 10,
  );

  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
};

export const garantiaSlaPdfFilename = (desarrolloNombre: string, generatedAt: string) => {
  const day = generatedAt.slice(0, 10);
  const slug = desarrolloNombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40);
  return `gabi-garantia-sla-${slug || "desarrollo"}-${day}.pdf`;
};

/** Descarga en navegador. */
export const downloadGarantiaSlaPdf = (input: GarantiaSlaPdfInput) => {
  const bytes = buildGarantiaSlaPdfBytes(input);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = garantiaSlaPdfFilename(input.desarrolloNombre, input.report.generatedAt);
  anchor.click();
  URL.revokeObjectURL(url);
};
