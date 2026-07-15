import { formatPrice } from "@/lib/data";
import { formatAreaM2 } from "@/lib/format/money";
import { formatMonthYear } from "@/lib/cotizador/pasaje-simulador";
import { formatPctShort } from "@/lib/corredor/mision-la-gavia-simulador";
import type { MisionLaGaviaSimulacionResult } from "@/lib/corredor/mision-la-gavia-simulador-data-types";

export type MisionLaGaviaSimuladorPdfInput = {
  desarrolloNombre: string;
  desarrolloLogo?: string;
  simulacion: MisionLaGaviaSimulacionResult;
  clienteNombre?: string;
  asesorNombre?: string;
  recamaras?: number;
};

const INK: [number, number, number] = [20, 69, 61];
const MUTED: [number, number, number] = [100, 116, 139];
const ACCENT: [number, number, number] = [91, 138, 125];
const SLATE_50: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];
const BORDER: [number, number, number] = [226, 232, 240];

type Rgb = [number, number, number];
type JsPDFDoc = import("jspdf").jsPDF;

const PAGE = {
  marginX: 14,
  marginTop: 12,
  marginBottom: 10,
  footerH: 22,
  gap: 3.5,
} as const;

const DISCLAIMERS = [
  "Vigencia de una semana, sujeto a cambio sin previo aviso.",
  "Lista de precios mar26 · valores referenciales.",
  "Esta cotización no constituye preaprobación ni compromiso de apartado.",
];

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40) || "prospecto";

type LogoAsset = { dataUrl: string; width: number; height: number };

const loadLogoAsset = async (logoPath?: string): Promise<LogoAsset | null> => {
  if (!logoPath || typeof window === "undefined") {
    return null;
  }

  try {
    const url = logoPath.startsWith("http")
      ? logoPath
      : `${window.location.origin}${logoPath.startsWith("/") ? "" : "/"}${logoPath}`;

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = reject;
      image.src = dataUrl;
    });

    return { dataUrl, ...dimensions };
  } catch {
    return null;
  }
};

const setFill = (doc: JsPDFDoc, rgb: Rgb) => doc.setFillColor(...rgb);
const setDraw = (doc: JsPDFDoc, rgb: Rgb) => doc.setDrawColor(...rgb);
const setText = (doc: JsPDFDoc, rgb: Rgb) => doc.setTextColor(...rgb);

const text = (
  doc: JsPDFDoc,
  value: string,
  x: number,
  y: number,
  opts?: { size?: number; bold?: boolean; color?: Rgb; align?: "left" | "center" | "right"; maxW?: number },
) => {
  setText(doc, opts?.color ?? INK);
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.setFontSize(opts?.size ?? 9);
  if (opts?.maxW) {
    const lines = doc.splitTextToSize(value, opts.maxW);
    doc.text(lines, x, y, { align: opts.align ?? "left" });
    return;
  }
  doc.text(value, x, y, { align: opts?.align ?? "left" });
};

const caps = (
  doc: JsPDFDoc,
  value: string,
  x: number,
  y: number,
  opts?: { size?: number; color?: Rgb },
) => {
  text(doc, value.toUpperCase(), x, y, {
    size: opts?.size ?? 6,
    bold: true,
    color: opts?.color ?? MUTED,
  });
};

export async function downloadMisionLaGaviaSimuladorPdf(
  input: MisionLaGaviaSimuladorPdfInput,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const logo = await loadLogoAsset(input.desarrolloLogo);
  const s = input.simulacion;

  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - PAGE.marginX * 2;
  const left = PAGE.marginX + 4;
  const footerTop = pageH - PAGE.marginBottom - PAGE.footerH;

  const fechaDoc = new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let y = PAGE.marginTop;

  setFill(doc, INK);
  doc.roundedRect(PAGE.marginX, y, contentW, 22, 2, 2, "F");
  if (logo) {
    const maxH = 12;
    const ratio = logo.width / Math.max(logo.height, 1);
    const h = maxH;
    const w = Math.min(36, h * ratio);
    try {
      doc.addImage(logo.dataUrl, "PNG", left, y + 5, w, h);
    } catch {
      // logo opcional
    }
  }
  text(doc, "Cotización · Misión La Gavia", left + (logo ? 40 : 0), y + 9, {
    size: 11,
    bold: true,
    color: WHITE,
  });
  text(doc, fechaDoc, left + (logo ? 40 : 0), y + 15, {
    size: 7,
    color: [200, 220, 210],
  });
  y += 26;

  setFill(doc, WHITE);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(PAGE.marginX, y, contentW, 28, 2, 2, "FD");
  caps(doc, "Prospecto", left, y + 6);
  text(doc, input.clienteNombre?.trim() || "Sin nombre", left, y + 12, {
    size: 11,
    bold: true,
  });
  caps(doc, "Asesor", left + contentW / 2, y + 6);
  text(doc, input.asesorNombre?.trim() || "—", left + contentW / 2, y + 12, {
    size: 10,
    bold: true,
  });
  text(doc, input.desarrolloNombre, left, y + 21, { size: 8, color: MUTED });
  y += 32;

  setFill(doc, SLATE_50);
  setDraw(doc, BORDER);
  doc.roundedRect(PAGE.marginX, y, contentW, 34, 2, 2, "FD");
  caps(doc, "Unidad", left, y + 6, { color: ACCENT });
  text(doc, `Departamento ${s.unidad}`, left, y + 13, { size: 12, bold: true });

  const specs: Array<[string, string]> = [
    ["Modelo", s.modelo],
    ["Edificio", s.edificio],
    ["Lado", s.lado],
    ["m² totales", formatAreaM2(s.m2Totales) || String(s.m2Totales)],
  ];
  if (input.recamaras) {
    specs.push(["Recámaras", String(input.recamaras)]);
  }
  if (s.entregaLabel) {
    specs.push(["Entrega", s.entregaLabel]);
  }

  const colW = (contentW - 8) / 3;
  specs.slice(0, 6).forEach(([label, value], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const sx = left + col * colW;
    const sy = y + 20 + row * 7;
    caps(doc, label, sx, sy, { size: 5.5 });
    text(doc, value, sx, sy + 3.5, { size: 8, bold: true, maxW: colW - 2 });
  });
  y += 38;

  setFill(doc, ACCENT);
  doc.roundedRect(PAGE.marginX, y, contentW * 0.42, 20, 2, 2, "F");
  caps(doc, "Precio lista mar26", left, y + 6, { color: WHITE, size: 5.5 });
  text(doc, formatPrice(s.precioLista), left, y + 14, {
    size: 12,
    bold: true,
    color: WHITE,
  });

  setFill(doc, INK);
  doc.roundedRect(PAGE.marginX + contentW * 0.42 + PAGE.gap, y, contentW * 0.58 - PAGE.gap, 20, 2, 2, "F");
  caps(doc, `Total ${s.esquemaLabel}`, PAGE.marginX + contentW * 0.42 + PAGE.gap + 4, y + 6, {
    color: WHITE,
    size: 5.5,
  });
  text(doc, formatPrice(s.precioTotal), PAGE.marginX + contentW * 0.42 + PAGE.gap + 4, y + 14, {
    size: 13,
    bold: true,
    color: WHITE,
  });
  y += 24;

  text(doc, s.descripcionPago, left, y + 2, { size: 8, color: MUTED, maxW: contentW - 8 });
  y += 10;

  const paymentRows: Array<[string, string, string?]> = [
    [`Enganche ${formatPctShort(s.enganchePct)}`, formatPrice(s.enganche)],
  ];
  if (s.mensualidad && s.numMensualidades) {
    paymentRows.push([
      `${s.numMensualidades} pagos`,
      formatPrice(s.mensualidad),
      s.fechaPrimerPago && s.fechaUltimoPago
        ? `${formatMonthYear(s.fechaPrimerPago)} – ${formatMonthYear(s.fechaUltimoPago)}`
        : undefined,
    ]);
  }
  if (s.finiquito) {
    paymentRows.push([
      `Finiquito ${formatPctShort(s.finiquitoPct ?? 0)}`,
      formatPrice(s.finiquito),
      s.fechaFiniquito ? formatMonthYear(s.fechaFiniquito) : s.entregaLabel,
    ]);
  }
  paymentRows.push([
    "Descuento vs lista",
    formatPctShort(s.descuentoVsListaPct),
  ]);

  setFill(doc, WHITE);
  setDraw(doc, BORDER);
  const payH = 8 + paymentRows.length * 8;
  doc.roundedRect(PAGE.marginX, y, contentW, payH, 2, 2, "FD");
  caps(doc, "Desglose de pagos", left, y + 5);
  paymentRows.forEach(([label, value, helper], index) => {
    const py = y + 11 + index * 8;
    text(doc, label, left, py, { size: 8 });
    text(doc, value, PAGE.marginX + contentW - 4, py, {
      size: 9,
      bold: true,
      align: "right",
    });
    if (helper) {
      text(doc, helper, left, py + 3.2, { size: 6.5, color: MUTED });
    }
  });
  y += payH + 6;

  setFill(doc, SLATE_50);
  doc.roundedRect(PAGE.marginX, y, contentW, 16, 2, 2, "F");
  caps(doc, "Plusvalía / renta referencial", left, y + 5);
  text(
    doc,
    `Renta estimada ${formatPrice(s.rentaMensual)}/mes · rendimiento rentas ~${formatPctShort(s.rendimientoRentasAnual)} anual`,
    left,
    y + 11,
    { size: 8, maxW: contentW - 8 },
  );

  setFill(doc, SLATE_50);
  doc.roundedRect(PAGE.marginX, footerTop, contentW, PAGE.footerH, 2, 2, "F");
  DISCLAIMERS.forEach((line, index) => {
    text(doc, `• ${line}`, left, footerTop + 5 + index * 4.5, {
      size: 6,
      color: MUTED,
      maxW: contentW - 8,
    });
  });

  const fileName = `cotizacion-gavia-${s.unidad}-${slugify(input.clienteNombre ?? "prospecto")}.pdf`;
  doc.save(fileName);
}
