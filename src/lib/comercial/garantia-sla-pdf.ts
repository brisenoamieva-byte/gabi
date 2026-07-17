import { jsPDF } from "jspdf";
import {
  GARANTIA_SLA_CONTRACT,
  type GarantiaSlaReport,
  type SlaCheck,
  type SlaStatus,
} from "@/lib/comercial/garantia-sla";

/** Paleta GABI — printable. */
const INK: [number, number, number] = [19, 49, 92];
const INK_SOFT: [number, number, number] = [30, 64, 110];
const MUTED: [number, number, number] = [100, 116, 139];
const SLATE: [number, number, number] = [51, 65, 85];
const LINE: [number, number, number] = [226, 232, 240];
const SURFACE: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];
const EMERALD: [number, number, number] = [5, 150, 105];
const EMERALD_BG: [number, number, number] = [236, 253, 245];
const AMBER: [number, number, number] = [217, 119, 6];
const AMBER_BG: [number, number, number] = [255, 251, 235];
const RED: [number, number, number] = [185, 28, 28];
const RED_BG: [number, number, number] = [254, 242, 242];

type Rgb = [number, number, number];
type JsPDFDoc = import("jspdf").jsPDF;

export type GarantiaSlaPdfInput = {
  desarrolloNombre: string;
  report: GarantiaSlaReport;
  planLabel?: string;
  contractNotes?: string;
  periodLabel?: string;
};

/**
 * Helvetica (jsPDF built-in) no tiene ≥ ≤ · — etc.
 * Sin esto el PDF imprime glifos rotos / letras espaciadas.
 */
const pdfSafe = (value: string): string =>
  value
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/·/g, " | ")
    .replace(/[—–]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");

const sealColor = (seal: GarantiaSlaReport["seal"]): Rgb => {
  if (seal === "verde") return EMERALD;
  if (seal === "riesgo") return AMBER;
  if (seal === "rojo") return RED;
  return MUTED;
};

const sealBg = (seal: GarantiaSlaReport["seal"]): Rgb => {
  if (seal === "verde") return EMERALD_BG;
  if (seal === "riesgo") return AMBER_BG;
  if (seal === "rojo") return RED_BG;
  return SURFACE;
};

const statusColor = (status: SlaStatus): Rgb => {
  if (status === "met") return EMERALD;
  if (status === "at_risk") return AMBER;
  if (status === "breached") return RED;
  return MUTED;
};

const statusLabel = (status: SlaStatus): string => {
  if (status === "met") return "CUMPLE";
  if (status === "at_risk") return "RIESGO";
  if (status === "breached") return "INCUMPLE";
  return "N/A";
};

const ensureSpace = (doc: JsPDFDoc, y: number, need: number, margin: number): number => {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need <= pageH - 16) return y;
  doc.addPage();
  return margin;
};

const drawFooter = (doc: JsPDFDoc, generatedAt: string, page: number, total: number) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(16, pageH - 12, pageW - 16, pageH - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    pdfSafe(`Generado ${new Date(generatedAt).toLocaleString("es-MX")} | gabi.mx`),
    16,
    pageH - 7,
  );
  doc.text(pdfSafe(`Página ${page} de ${total}`), pageW - 16, pageH - 7, { align: "right" });
};

const drawSectionTitle = (doc: JsPDFDoc, title: string, y: number, margin: number) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(pdfSafe(title), margin, y);
  return y + 5;
};

const drawKpiCard = (
  doc: JsPDFDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accent?: Rgb,
) => {
  doc.setFillColor(...SURFACE);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  if (accent) {
    doc.setFillColor(...accent);
    doc.rect(x, y, 1.4, h, "F");
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(pdfSafe(label), x + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(pdfSafe(value), x + 4, y + 13);
};

const drawProgressBar = (
  doc: JsPDFDoc,
  x: number,
  y: number,
  w: number,
  pct: number,
  color: Rgb,
) => {
  const clamped = Math.max(0, Math.min(100, pct));
  doc.setFillColor(...LINE);
  doc.roundedRect(x, y, w, 2.2, 1, 1, "F");
  if (clamped > 0) {
    doc.setFillColor(...color);
    doc.roundedRect(x, y, Math.max(1.5, (w * clamped) / 100), 2.2, 1, 1, "F");
  }
};

const progressForCheck = (check: SlaCheck): number | null => {
  if (check.unit === "pct") return check.actualValue;
  if (check.unit === "count" && check.targetValue === 0) {
    // Invertido: 0 ideal. Escala suave hasta el umbral de riesgo visual.
    const riskCap = Math.max(check.actualValue, 10);
    return Math.max(0, 100 - (check.actualValue / riskCap) * 100);
  }
  return null;
};

/** Genera PDF carta (bytes) — usable en servidor (cron/email) o cliente. */
export const buildGarantiaSlaPdfBytes = (input: GarantiaSlaPdfInput): Uint8Array => {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  const planLabel = input.planLabel?.trim() || GARANTIA_SLA_CONTRACT.planLabelDefault;
  const period =
    input.periodLabel ??
    new Date(input.report.generatedAt).toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const report = input.report;
  const color = sealColor(report.seal);

  // —— Header ——
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GABI", margin, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(pdfSafe("Reporte semanal  |  Garantía de seguimiento"), margin, 17);
  doc.setFontSize(8);
  doc.text(pdfSafe(`${planLabel}  v${GARANTIA_SLA_CONTRACT.version}`), margin, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(pdfSafe(input.desarrolloNombre), pageW - margin, 12, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(pdfSafe(`Periodo: ${period}`), pageW - margin, 18, { align: "right" });

  y = 36;

  // —— Sello ——
  doc.setFillColor(...sealBg(report.seal));
  doc.setDrawColor(...color);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentW, 22, 2.5, 2.5, "FD");

  doc.setFillColor(...color);
  doc.roundedRect(margin + 3, y + 3.5, 42, 15, 2, 2, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(pdfSafe(report.sealLabel), margin + 24, y + 12.5, { align: "center" });

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`${report.garantiaScorePct}%`, margin + 52, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(pdfSafe("Score de garantía"), margin + 52, y + 16);

  const messageLines = doc.splitTextToSize(
    pdfSafe(report.sealMessage || ""),
    contentW - 95,
  );
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text(messageLines, margin + 88, y + 8);
  y += 28;

  // —— KPIs ——
  y = drawSectionTitle(doc, "Resumen operativo", y, margin);
  const kpiH = 18;
  const gap = 3;
  const kpiW = (contentW - gap * 3) / 4;
  const kpis: { label: string; value: string; accent?: Rgb }[] = [
    {
      label: "Leads activos",
      value: String(report.compliance.activeLeads),
      accent: INK_SOFT,
    },
    {
      label: "Al día (playbook)",
      value: `${report.compliance.compliantLeads} (${report.compliance.compliancePct}%)`,
      accent: report.compliance.compliancePct >= 95 ? EMERALD : RED,
    },
    {
      label: "Pasos vencidos",
      value: String(report.compliance.overdueCount),
      accent: report.compliance.overdueCount === 0 ? EMERALD : RED,
    },
    {
      label: report.cadencia ? "Toques cadencia vencidos" : "Cadencia",
      value: report.cadencia ? String(report.cadencia.overdueTouchesTotal) : "N/A",
      accent: report.cadencia
        ? report.cadencia.overdueTouchesTotal === 0
          ? EMERALD
          : RED
        : MUTED,
    },
  ];
  kpis.forEach((kpi, i) => {
    drawKpiCard(doc, margin + i * (kpiW + gap), y, kpiW, kpiH, kpi.label, kpi.value, kpi.accent);
  });
  y += kpiH + 8;

  if (report.cadencia) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      pdfSafe(
        `Cadencia: ${report.cadencia.activeCount} activas | ${report.cadencia.dueTodayTotal} para hoy | ${report.cadencia.expiredCount} expiradas | respuesta ${report.cadencia.responseRatePct}%`,
      ),
      margin,
      y,
    );
    y += 7;
  }

  // —— Calificación A/B/C (secundaria) ——
  const perfil = report.perfilCalificacion;
  if (perfil && perfil.total > 0) {
    y = ensureSpace(doc, y, 28, margin);
    y = drawSectionTitle(doc, "Calificación comercial A/B/C (post-visita)", y, margin);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      pdfSafe(
        "Métrica de calidad del lead. No forma parte del sello SLA (el sello mide proceso de seguimiento).",
      ),
      margin,
      y,
    );
    y += 5;

    const abcW = (contentW - gap * 3) / 4;
    const abcH = 16;
    const abcCards: { label: string; value: string; accent: Rgb }[] = [
      { label: "Calificación A", value: String(perfil.a), accent: EMERALD },
      { label: "Calificación B", value: String(perfil.b), accent: AMBER },
      { label: "Calificación C", value: String(perfil.c), accent: RED },
      {
        label: "Sin perfilar",
        value: String(perfil.sinPerfil),
        accent: MUTED,
      },
    ];
    abcCards.forEach((kpi, i) => {
      drawKpiCard(doc, margin + i * (abcW + gap), y, abcW, abcH, kpi.label, kpi.value, kpi.accent);
    });
    y += abcH + 5;
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text(
      pdfSafe(
        `${perfil.perfiladosPct}% de leads activos con A/B/C | ${perfil.visitaSinPerfil} en etapa Visita sin perfilar`,
      ),
      margin,
      y,
    );
    y += 8;
  }

  // —— Checks table ——
  y = ensureSpace(doc, y, 40, margin);
  y = drawSectionTitle(doc, "Compromisos SLA", y, margin);

  const colLabel = margin;
  const colMeta = margin + 58;
  const colActual = margin + 88;
  const colBar = margin + 112;
  const colStatus = pageW - margin - 22;
  const barW = 38;

  doc.setFillColor(...INK);
  doc.roundedRect(margin, y, contentW, 7, 1, 1, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Indicador", colLabel + 2, y + 4.7);
  doc.text("Meta", colMeta, y + 4.7);
  doc.text("Actual", colActual, y + 4.7);
  doc.text("Avance", colBar, y + 4.7);
  doc.text("Estado", colStatus, y + 4.7, { align: "right" });
  y += 9;

  for (const check of report.checks) {
    y = ensureSpace(doc, y, 16, margin);
    const rowTop = y;
    const detail = pdfSafe(check.detail || check.promise);
    const detailLines = doc.splitTextToSize(detail, contentW - 4);
    const rowH = Math.max(12, 7 + detailLines.length * 3.2);

    doc.setFillColor(...SURFACE);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, rowTop, contentW, rowH, 1.2, 1.2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(pdfSafe(check.label), colLabel + 2, rowTop + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text(pdfSafe(check.targetLabel), colMeta, rowTop + 4.5);
    doc.setFont("helvetica", "bold");
    doc.text(pdfSafe(check.actualLabel), colActual, rowTop + 4.5);

    const progress = progressForCheck(check);
    if (progress != null) {
      drawProgressBar(doc, colBar, rowTop + 3.2, barW, progress, statusColor(check.status));
    }

    const stColor = statusColor(check.status);
    doc.setFillColor(...stColor);
    doc.roundedRect(colStatus - 20, rowTop + 1.8, 20, 5.2, 1, 1, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(statusLabel(check.status), colStatus - 10, rowTop + 5.3, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(detailLines, colLabel + 2, rowTop + 9);
    y = rowTop + rowH + 2.5;
  }

  // —— Asesores (top peores) ——
  const asesores = [...report.asesores]
    .sort((a, b) => a.compliancePct - b.compliancePct || b.overdueIssues - a.overdueIssues)
    .slice(0, 8);

  if (asesores.length) {
    y = ensureSpace(doc, y, 28, margin);
    y += 2;
    y = drawSectionTitle(doc, "Asesores (menor cumplimiento primero)", y, margin);

    doc.setFillColor(...INK);
    doc.roundedRect(margin, y, contentW, 6.5, 1, 1, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("Asesor", margin + 2, y + 4.3);
    doc.text("Leads", margin + 78, y + 4.3);
    doc.text(pdfSafe("Al día"), margin + 98, y + 4.3);
    doc.text("Vencidos", margin + 122, y + 4.3);
    doc.text("Confianza", pageW - margin - 2, y + 4.3, { align: "right" });
    y += 8;

    for (const row of asesores) {
      y = ensureSpace(doc, y, 7, margin);
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.line(margin, y + 4.5, pageW - margin, y + 4.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...SLATE);
      doc.text(pdfSafe(row.asesorNombre).slice(0, 36), margin + 2, y + 3.5);
      doc.text(String(row.activeLeads), margin + 78, y + 3.5);
      doc.setTextColor(...statusColor(row.compliancePct >= 95 ? "met" : row.compliancePct >= 85 ? "at_risk" : "breached"));
      doc.setFont("helvetica", "bold");
      doc.text(`${row.compliancePct}%`, margin + 98, y + 3.5);
      doc.setTextColor(...SLATE);
      doc.setFont("helvetica", "normal");
      doc.text(String(row.overdueIssues), margin + 122, y + 3.5);
      doc.text(`${row.confidencePct}%`, pageW - margin - 2, y + 3.5, { align: "right" });
      y += 6;
    }
  }

  // —— Excepciones ——
  if (report.topExceptions.length) {
    y = ensureSpace(doc, y, 30, margin);
    y += 3;
    y = drawSectionTitle(doc, "Excepciones prioritarias (top 10)", y, margin);

    doc.setFillColor(...INK);
    doc.roundedRect(margin, y, contentW, 6.5, 1, 1, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("#", margin + 2, y + 4.3);
    doc.text("Prospecto", margin + 10, y + 4.3);
    doc.text("Asesor", margin + 78, y + 4.3);
    doc.text("Paso", margin + 118, y + 4.3);
    doc.text("Estado", pageW - margin - 2, y + 4.3, { align: "right" });
    y += 8;

    report.topExceptions.slice(0, 10).forEach((row, index) => {
      y = ensureSpace(doc, y, 8, margin);
      const issue = row.issues[0];
      const overdue = issue?.status === "overdue";
      doc.setFillColor(...(index % 2 === 0 ? SURFACE : WHITE));
      doc.rect(margin, y - 1, contentW, 6.5, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(String(index + 1), margin + 2, y + 3.2);
      doc.setTextColor(...SLATE);
      doc.text(pdfSafe(row.nombre).slice(0, 32), margin + 10, y + 3.2);
      doc.text(pdfSafe(row.asesorNombre ?? "Sin asesor").slice(0, 20), margin + 78, y + 3.2);
      doc.text(pdfSafe(issue?.stepLabel ?? "-").slice(0, 28), margin + 118, y + 3.2);
      doc.setTextColor(...(overdue ? RED : AMBER));
      doc.setFont("helvetica", "bold");
      doc.text(overdue ? "Vencido" : "Pendiente", pageW - margin - 2, y + 3.2, {
        align: "right",
      });
      y += 6.5;
    });
  }

  // —— Contrato (página aparte si hace falta) ——
  y = ensureSpace(doc, y, 45, margin);
  y += 4;
  y = drawSectionTitle(doc, "Contrato operativo (resumen)", y, margin);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  for (const clause of GARANTIA_SLA_CONTRACT.clauses) {
    const lines = doc.splitTextToSize(pdfSafe(`- ${clause}`), contentW);
    y = ensureSpace(doc, y, lines.length * 3.4 + 2, margin);
    doc.text(lines, margin, y);
    y += lines.length * 3.4 + 1.8;
  }

  if (input.contractNotes?.trim()) {
    y = ensureSpace(doc, y, 20, margin);
    y += 2;
    y = drawSectionTitle(doc, "Notas del desarrollo", y, margin);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    const noteLines = doc.splitTextToSize(pdfSafe(input.contractNotes.trim()), contentW);
    y = ensureSpace(doc, y, noteLines.length * 3.5, margin);
    doc.text(noteLines, margin, y);
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, report.generatedAt, page, totalPages);
  }

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
