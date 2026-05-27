import type { DisponibilidadUnidad } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import { formatAreaM2 } from "@/lib/format/money";
import {
  formatMonthYear,
  formatPctShort,
  type PasajeSimuladorResultado,
  type PasajeUnidadTipo,
} from "@/lib/cotizador/pasaje-simulador";
import { getPasajeDeptosAcabados } from "@/lib/catalog/pasaje-alamos-acabados";

export type PasajeSimuladorPdfInput = {
  desarrolloNombre: string;
  desarrolloLogo?: string;
  resultado: PasajeSimuladorResultado;
  clienteNombre?: string;
  asesorNombre?: string;
  clusterNombre?: string;
  prototipoNombre?: string;
  unidadNombre?: string;
  unidad?: DisponibilidadUnidad;
  tipo: PasajeUnidadTipo;
  recamaras?: number;
};

const INK: [number, number, number] = [36, 46, 56];
const INK_DEEP: [number, number, number] = [26, 35, 43];
const MUTED: [number, number, number] = [100, 116, 139];
const ACCENT: [number, number, number] = [199, 166, 148];
const GREEN: [number, number, number] = [108, 194, 74];
const GREEN_DEEP: [number, number, number] = [74, 150, 52];
const SLATE_50: [number, number, number] = [248, 250, 252];
const SLATE_100: [number, number, number] = [241, 245, 249];
const ACCENT_TINT: [number, number, number] = [250, 245, 241];
const GREEN_TINT: [number, number, number] = [240, 253, 244];
const AMBER_BG: [number, number, number] = [255, 251, 235];
const AMBER_INK: [number, number, number] = [120, 53, 15];
const WHITE: [number, number, number] = [255, 255, 255];
const BORDER: [number, number, number] = [226, 232, 240];
const MUTED_ON_DARK: [number, number, number] = [190, 190, 190];

type Rgb = [number, number, number];
type TextAlign = "left" | "right" | "center";
type JsPDFDoc = import("jspdf").jsPDF;

/** Carta US — todo el contenido cabe en una sola página. */
const PAGE = {
  marginX: 14,
  marginTop: 10,
  marginBottom: 8,
  footerH: 26,
  gap: 3,
} as const;

const DISCLAIMERS = [
  "Vigencia de una semana, sujeto a cambio sin previo aviso.",
  "Apartado de $50,000 MXN se tomará a cuenta de enganche.",
  "Valores referenciales; esta consulta no constituye preaprobación.",
  "Plusvalía estimada es aproximada y no constituye compromiso del desarrollador.",
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

const roundedRect = (
  doc: JsPDFDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  mode: "F" | "S" | "FD" = "F",
  radius = 2,
) => {
  doc.roundedRect(x, y, w, h, radius, radius, mode);
};

const text = (
  doc: JsPDFDoc,
  value: string,
  x: number,
  y: number,
  opts: {
    size?: number;
    bold?: boolean;
    color?: Rgb;
    align?: TextAlign;
    maxW?: number;
  } = {},
) => {
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(opts.size ?? 9);
  setText(doc, opts.color ?? INK);
  const maxW = opts.maxW;
  if (maxW && maxW > 0) {
    const lines = doc.splitTextToSize(value, maxW);
    doc.text(lines, x, y, { align: opts.align ?? "left", maxWidth: maxW });
    return;
  }
  doc.text(value, x, y, { align: opts.align ?? "left" });
};

const caps = (
  doc: JsPDFDoc,
  value: string,
  x: number,
  y: number,
  opts: { color?: Rgb; size?: number; align?: TextAlign; maxW?: number } = {},
) => {
  text(doc, value.toUpperCase(), x, y, {
    size: opts.size ?? 6,
    bold: true,
    color: opts.color ?? MUTED,
    align: opts.align,
    maxW: opts.maxW,
  });
};

const drawMiniTile = (
  doc: JsPDFDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  helper?: string,
  fill: Rgb = SLATE_50,
  stroke: Rgb = BORDER,
) => {
  const pad = 3.5;
  const innerW = w - pad * 2;
  setFill(doc, fill);
  setDraw(doc, stroke);
  doc.setLineWidth(0.15);
  roundedRect(doc, x, y, w, h, "FD");

  const labelLines = doc.splitTextToSize(label.toUpperCase(), innerW);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  setText(doc, MUTED);
  doc.text(labelLines, x + pad, y + 4.5, { maxWidth: innerW });

  const labelH = (Array.isArray(labelLines) ? labelLines.length : 1) * 2.4;
  text(doc, value, x + pad, y + 4.5 + labelH + 1.5, {
    size: 9.5,
    bold: true,
    maxW: innerW,
  });

  if (helper) {
    text(doc, helper, x + pad, y + h - 3, { size: 6, color: MUTED, maxW: innerW });
  }
};

function drawFooter(doc: JsPDFDoc, pageW: number, pageH: number, contentW: number) {
  const footerTop = pageH - PAGE.marginBottom - PAGE.footerH;
  const left = PAGE.marginX + 5;
  const innerW = contentW - 10;
  const colW = (innerW - 4) / 2;

  setFill(doc, SLATE_100);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.12);
  roundedRect(doc, PAGE.marginX, footerTop, contentW, PAGE.footerH, "FD");

  caps(doc, "Términos y condiciones", left, footerTop + 4.5, { size: 6.5 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setText(doc, MUTED);
  const lineH = 3.1;
  let yLeft = footerTop + 8.5;
  let yRight = footerTop + 8.5;

  DISCLAIMERS.forEach((line, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = col === 0 ? left : left + colW + 4;
    const yy = (col === 0 ? yLeft : yRight) + row * lineH;
    const wrapped = doc.splitTextToSize(line, colW);
    doc.text(wrapped, x, yy);
    if (col === 0) {
      yLeft += wrapped.length * lineH;
    } else {
      yRight += wrapped.length * lineH;
    }
  });

  setDraw(doc, GREEN);
  doc.setLineWidth(0.6);
  doc.line(PAGE.marginX + 5, pageH - PAGE.marginBottom - 1, PAGE.marginX + 16, pageH - PAGE.marginBottom - 1);
  text(doc, "gabi · BBR Asesores", left, pageH - PAGE.marginBottom + 2, {
    size: 6.5,
    bold: true,
    color: GREEN,
  });
}

function drawHeader(
  doc: JsPDFDoc,
  y: number,
  contentW: number,
  input: PasajeSimuladorPdfInput,
  logo: LogoAsset | null,
  fechaDoc: string,
): number {
  const h = 32;
  const left = PAGE.marginX + 5;
  const right = PAGE.marginX + contentW - 5;

  setFill(doc, INK);
  roundedRect(doc, PAGE.marginX, y, contentW, h, "F", 2.5);
  setFill(doc, INK_DEEP);
  doc.rect(PAGE.marginX, y + h - 13, contentW, 13, "F");

  const logoBoxW = 38;
  const logoBoxH = 12;
  const logoX = left;
  const logoY = y + 4;
  setFill(doc, WHITE);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.12);
  roundedRect(doc, logoX, logoY, logoBoxW, logoBoxH, "FD", 1.5);

  if (logo) {
    const scale = Math.min((logoBoxW - 3) / logo.width, (logoBoxH - 2) / logo.height);
    const drawW = logo.width * scale;
    const drawH = logo.height * scale;
    doc.addImage(
      logo.dataUrl,
      logo.dataUrl.includes("image/png") ? "PNG" : "JPEG",
      logoX + (logoBoxW - drawW) / 2,
      logoY + (logoBoxH - drawH) / 2,
      drawW,
      drawH,
    );
  } else {
    text(doc, input.desarrolloNombre, logoX + logoBoxW / 2, logoY + logoBoxH / 2, {
      size: 6,
      bold: true,
      color: INK,
      align: "center",
      maxW: logoBoxW - 2,
    });
  }

  const titleX = logoX + logoBoxW + 4;
  const dateW = 38;
  const titleMaxW = right - titleX - dateW - 3;

  caps(doc, "Cotización", titleX, y + 7, { color: ACCENT, size: 5.5 });
  text(doc, input.desarrolloNombre, titleX, y + 12, {
    size: 10.5,
    bold: true,
    color: WHITE,
    maxW: titleMaxW,
  });
  if (input.asesorNombre?.trim()) {
    text(doc, `Asesor: ${input.asesorNombre.trim()}`, titleX, y + 17, {
      size: 6.5,
      color: MUTED_ON_DARK,
      maxW: titleMaxW,
    });
  }

  caps(doc, "Elaboración", right, y + 7, { color: MUTED_ON_DARK, size: 5.5, align: "right", maxW: dateW });
  text(doc, fechaDoc, right, y + 12, { size: 7.5, color: WHITE, align: "right", maxW: dateW });

  caps(doc, "Prospecto", left, y + h - 10, { color: MUTED_ON_DARK, size: 5.5 });
  text(doc, input.clienteNombre?.trim() || "Sin nombre", left, y + h - 5, {
    size: 9.5,
    bold: true,
    color: WHITE,
    maxW: contentW - 10,
  });

  return y + h + PAGE.gap;
}

export async function downloadPasajeSimuladorPdf(
  input: PasajeSimuladorPdfInput,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const logo = await loadLogoAsset(input.desarrolloLogo);

  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - PAGE.marginX * 2;
  const left = PAGE.marginX + 5;
  const right = PAGE.marginX + contentW - 5;
  const innerW = contentW - 10;
  const footerTop = pageH - PAGE.marginBottom - PAGE.footerH;

  const tipoLabel = input.tipo === "oficina" ? "Oficina" : "Departamento";
  const unidadTitulo =
    input.tipo === "oficina"
      ? `Oficina ${input.unidadNombre ?? "—"}`
      : `Departamento ${input.unidadNombre ?? "—"}`;
  const fechaDoc = new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const { resultado: r } = input;
  const ahorroEsquema = Math.max(0, r.precioLista - r.precioTotal);

  let y = PAGE.marginTop;
  y = drawHeader(doc, y, contentW, input, logo, fechaDoc);

  // —— Producto (specs en 3 columnas) ——
  const specs: Array<[string, string]> = [];
  if (input.prototipoNombre) specs.push(["Modelo", input.prototipoNombre]);
  if (input.clusterNombre) specs.push(["Cluster", input.clusterNombre]);
  if (input.unidad?.nivel) specs.push(["Nivel", input.unidad.nivel]);
  if (input.recamaras) specs.push(["Recámaras", String(input.recamaras)]);
  if (input.unidad?.cajones) specs.push(["Cajones", String(input.unidad.cajones)]);

  const pushArea = (label: string, value?: number | null) => {
    const formatted = formatAreaM2(value ?? undefined);
    if (formatted) specs.push([label, formatted]);
  };
  pushArea("Sup. interna", input.unidad?.superficieInternaM2);
  pushArea("Terraza / balcón", input.unidad?.superficieExternaM2);
  pushArea("Bodega", input.unidad?.superficieBodegaM2);
  pushArea("Sup. total", input.unidad?.superficieConstruccionM2);

  const specCols = 3;
  const specRows = Math.ceil(specs.length / specCols);
  const productH = 14 + specRows * 7;
  setFill(doc, WHITE);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.2);
  roundedRect(doc, PAGE.marginX, y, contentW, productH, "FD", 2);
  setFill(doc, ACCENT);
  doc.rect(PAGE.marginX, y, 2.5, productH, "F");

  caps(doc, tipoLabel, left, y + 5, { color: ACCENT, size: 6 });
  text(doc, unidadTitulo, left, y + 10, { size: 10, bold: true, maxW: innerW - 40 });

  if (input.tipo === "oficina") {
    setFill(doc, AMBER_BG);
    setDraw(doc, [252, 211, 77]);
    roundedRect(doc, right - 28, y + 3, 26, 6, "FD", 1);
    text(doc, "+ IVA", right - 15, y + 7, { size: 6, bold: true, color: AMBER_INK, align: "center" });
  }

  const specColW = innerW / specCols;
  const specY0 = y + 15;
  specs.forEach(([label, value], index) => {
    const col = index % specCols;
    const row = Math.floor(index / specCols);
    const sx = left + col * specColW;
    const sy = specY0 + row * 7;
    caps(doc, label, sx, sy, { size: 5.5 });
    text(doc, value, sx, sy + 3.5, { size: 7.5, bold: true, maxW: specColW - 2 });
  });

  y += productH + PAGE.gap;

  // —— Precio lista + esquema (misma fila) ——
  const rowH = 22;
  const listaW = contentW * 0.42;
  const esquemaW = contentW - listaW - PAGE.gap;
  const esquemaX = PAGE.marginX + listaW + PAGE.gap;

  drawMiniTile(
    doc,
    PAGE.marginX,
    y,
    listaW,
    rowH,
    "Precio de lista",
    formatPrice(r.precioLista),
    undefined,
    ACCENT_TINT,
    ACCENT,
  );

  setFill(doc, GREEN_TINT);
  setDraw(doc, GREEN);
  doc.setLineWidth(0.2);
  roundedRect(doc, esquemaX, y, esquemaW, rowH, "FD", 2);

  const chipLabel = r.esquemaLabel.toUpperCase();
  const chipW = Math.min(44, Math.max(30, doc.getTextWidth(chipLabel) * 0.28 + 12));
  const chipX = esquemaX + 4;
  const chipY = y + (rowH - 9) / 2;
  setFill(doc, INK);
  roundedRect(doc, chipX, chipY, chipW, 9, "F", 1.5);
  text(doc, chipLabel, chipX + chipW / 2, chipY + 5.8, {
    size: 7,
    bold: true,
    color: WHITE,
    align: "center",
  });

  const discX = chipX + chipW + 4;
  const discW = esquemaX + esquemaW - discX - 4;
  caps(doc, "Descuento efectivo", discX, y + 5, { color: GREEN_DEEP, size: 5.5 });
  text(doc, formatPctShort(r.descuentoEfectivoPct), discX, y + 11.5, {
    size: 13,
    bold: true,
    color: GREEN_DEEP,
    maxW: discW,
  });
  if (ahorroEsquema > 0) {
    text(doc, `Ahorro ${formatPrice(ahorroEsquema)}`, discX, y + 17.5, {
      size: 7,
      color: MUTED,
      maxW: discW,
    });
  }

  y += rowH + PAGE.gap;

  // —— Total ——
  const totalH = 20;
  setFill(doc, INK);
  roundedRect(doc, PAGE.marginX, y, contentW, totalH, "F", 2.5);
  setFill(doc, GREEN);
  doc.rect(PAGE.marginX, y, 2.5, totalH, "F");
  caps(doc, "Total según esquema elegido", left + 2, y + 7, {
    color: MUTED_ON_DARK,
    size: 6.5,
    maxW: innerW * 0.5,
  });
  text(doc, formatPrice(r.precioTotal), right - 2, y + 15, {
    size: 15,
    bold: true,
    color: WHITE,
    align: "right",
    maxW: innerW * 0.55,
  });

  y += totalH + PAGE.gap;

  // —— Desglose (1 fila) ——
  caps(doc, "Desglose de pagos", left, y + 2, { size: 6.5 });
  y += 5;

  const tiles: Array<{ label: string; value: string; helper?: string }> = [
    { label: `Enganche (${formatPctShort(r.enganchePct)})`, value: formatPrice(r.enganche) },
  ];
  if (r.mensualidadCliente && r.numMensualidades) {
    tiles.push({
      label: `${r.numMensualidades} mensualidades`,
      value: formatPrice(r.mensualidadCliente),
      helper:
        r.fechaPrimerMes && r.fechaUltimoMes
          ? `${formatMonthYear(r.fechaPrimerMes)} – ${formatMonthYear(r.fechaUltimoMes)}`
          : undefined,
    });
  }
  if (r.pagoIntermedio) {
    tiles.push({
      label: `Pago (${formatPctShort(r.pagoIntermedioPct ?? 0)})`,
      value: formatPrice(r.pagoIntermedio),
      helper: r.fechaPagoIntermedio ? formatMonthYear(r.fechaPagoIntermedio) : undefined,
    });
  }
  if (r.finiquito) {
    tiles.push({
      label: `Finiquito (${formatPctShort(r.finiquitoPct ?? 0)})`,
      value: formatPrice(r.finiquito),
      helper: r.fechaFiniquito ? formatMonthYear(r.fechaFiniquito) : undefined,
    });
  }

  const tileCount = tiles.length;
  const tileGap = 2.5;
  const tileH = 18;
  const tileW = (contentW - tileGap * (tileCount - 1)) / tileCount;
  tiles.forEach((tile, index) => {
    drawMiniTile(
      doc,
      PAGE.marginX + index * (tileW + tileGap),
      y,
      tileW,
      tileH,
      tile.label,
      tile.value,
      tile.helper,
    );
  });

  y += tileH + PAGE.gap;

  // —— Rentas ——
  const rentasH = 16;
  setFill(doc, ACCENT_TINT);
  setDraw(doc, ACCENT);
  doc.setLineWidth(0.15);
  roundedRect(doc, PAGE.marginX, y, contentW, rentasH, "FD", 2);
  caps(doc, "Ejercicio de rentas (estimado)", left, y + 5, { color: [125, 91, 70], size: 6 });

  const rentColW = innerW / 3;
  const rentMetrics = [
    { label: "Renta mensual", value: formatPrice(r.rentaMensual) },
    { label: "Rend. rentas", value: formatPctShort(r.rendimientoRentasAnual) },
    { label: "Rend. total est.", value: formatPctShort(r.rendimientoTotalAnual), color: GREEN },
  ];
  rentMetrics.forEach((metric, index) => {
    const cx = left + index * rentColW;
    text(doc, metric.label, cx, y + 10, { size: 6, color: MUTED, maxW: rentColW - 2 });
    text(doc, metric.value, cx, y + 14, {
      size: 9,
      bold: true,
      color: metric.color ?? INK,
      maxW: rentColW - 2,
    });
  });

  y += rentasH + PAGE.gap;

  // —— Acabados (resumen Anexo C, solo departamentos) ——
  if (input.tipo === "departamento") {
    const { pdfResumen, noIncluye } = getPasajeDeptosAcabados();
    const acabadosH = 22;
    setFill(doc, WHITE);
    setDraw(doc, BORDER);
    doc.setLineWidth(0.15);
    roundedRect(doc, PAGE.marginX, y, contentW, acabadosH, "FD", 2);
    caps(doc, "Acabados incluidos · Anexo C", left, y + 4.5, { color: ACCENT, size: 6 });

    const colW = innerW / 2;
    pdfResumen.forEach((line, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      text(doc, `· ${line}`, left + col * colW, y + 9 + row * 3.2, {
        size: 5.5,
        color: INK,
        maxW: colW - 3,
      });
    });

    const noIncluyeLine = `No incluye: ${noIncluye.slice(0, 2).join("; ")}…`;
    text(doc, noIncluyeLine, left, y + acabadosH - 3, {
      size: 5,
      color: MUTED,
      maxW: innerW,
    });

    y += acabadosH + PAGE.gap;
  }

  // Pie fijo al fondo (nunca se superpone)
  drawFooter(doc, pageW, pageH, contentW);

  // Sanity: el contenido no debe invadir el pie
  if (y + rentasH > footerTop - 2) {
    console.warn("[pasaje-simulador-pdf] El contenido excede el área útil de una página.");
  }

  const clienteSlug = slugify(input.clienteNombre ?? "cotizacion");
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`cotizacion-${clienteSlug}-${dateSlug}.pdf`);
}
