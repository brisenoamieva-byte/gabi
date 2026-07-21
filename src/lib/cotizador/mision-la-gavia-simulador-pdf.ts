import { formatPrice } from "@/lib/data";
import { formatAreaM2 } from "@/lib/format/money";
import { formatMonthYear } from "@/lib/cotizador/pasaje-simulador";
import {
  buildCalendarioPagosMisionLaGavia,
  formatPctShort,
  MISION_LA_GAVIA_DIA_PAGO_DEFAULT,
} from "@/lib/corredor/mision-la-gavia-simulador";
import type {
  MisionLaGaviaDiaPago,
  MisionLaGaviaFilaPago,
  MisionLaGaviaSimulacionResult,
} from "@/lib/corredor/mision-la-gavia-simulador-data-types";
import {
  decodeMisionLaGaviaUnidad,
  type GaviaTipologia,
} from "@/lib/disponibilidad/planos/mision-la-gavia";
import { resolveGaviaPlantaAssets } from "@/lib/disponibilidad/planos/plantas";

export type MisionLaGaviaSimuladorPdfInput = {
  desarrolloNombre: string;
  desarrolloLogo?: string;
  simulacion: MisionLaGaviaSimulacionResult;
  clienteNombre?: string;
  asesorNombre?: string;
  recamaras?: number;
  /** Día fijo de enganche/mensualidades en el plan de pagos. */
  diaPago?: MisionLaGaviaDiaPago;
};

/** Paleta Gavia — contraste alto para impresión. */
const INK: [number, number, number] = [20, 69, 61];
const INK_DEEP: [number, number, number] = [14, 48, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const MUTED_ON_DARK: [number, number, number] = [168, 198, 188];
const ACCENT: [number, number, number] = [91, 138, 125];
const CREAM: [number, number, number] = [250, 249, 246];
const SLATE_50: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];
const BORDER: [number, number, number] = [214, 222, 218];

type Rgb = [number, number, number];
type JsPDFDoc = import("jspdf").jsPDF;

const PAGE = {
  marginX: 12,
  marginTop: 10,
  marginBottom: 8,
  footerH: 10,
  gap: 2.5,
} as const;

/** Términos oficiales de cotización Misión La Gavia. */
export const MISION_LA_GAVIA_TERMINOS_CONDICIONES = [
  "Todos los precios tienen una vigencia de 10 días naturales y están sujetos a cambio sin previo aviso.",
  "El apartado es de $50,000.00 (cincuenta mil pesos 00/100 M.N.) y deberá pagarse en una sola exhibición para bloquear la Unidad Residencial de su interés. La cantidad restante se cubrirá conforme al plan comercial pactado por escrito.",
  "Antes de realizar cualquier pago, deberá integrar su expediente básico: identificación oficial vigente, carta oferta o contrato de promesa de compraventa debidamente firmado así como el formato de Ley Antilavado.",
  "La disponibilidad y los precios pueden cambiar sin previo aviso hasta que exista carta oferta firmada y apartado confirmado.",
  "Los valores anteriores son sólo referenciales e informativos, por lo que esta consulta no constituye preaprobación y por lo tanto no compromete al desarrollo.",
  "Las imágenes, renders y demás elementos visuales incluidos en esta cotización son de carácter ilustrativo y pueden modificarse sin previo aviso.",
  "Todos los pagos deberán provenir de la cuenta del comprador.",
] as const;

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40) || "prospecto";

type ImageAsset = { dataUrl: string; width: number; height: number; format: "PNG" | "JPEG" };

const detectImageFormat = (dataUrl: string): "PNG" | "JPEG" =>
  dataUrl.includes("image/png") ? "PNG" : "JPEG";

/** Preferir assets pensados para fondo claro (el logo principal es verde oscuro). */
const resolveGaviaLogoForPdf = (logoPath?: string): string | undefined => {
  if (!logoPath) {
    return "/logos/mision-la-gavia-selector.png";
  }
  if (
    logoPath.includes("mision-la-gavia.png") &&
    !logoPath.includes("selector") &&
    !logoPath.includes("mark")
  ) {
    return "/logos/mision-la-gavia-selector.png";
  }
  return logoPath;
};

const loadImageAsset = async (imagePath?: string): Promise<ImageAsset | null> => {
  if (!imagePath || typeof window === "undefined") {
    return null;
  }

  try {
    const url = imagePath.startsWith("http")
      ? imagePath
      : `${window.location.origin}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;

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

    return { dataUrl, ...dimensions, format: detectImageFormat(dataUrl) };
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
  style: "S" | "F" | "FD" = "S",
  r = 1.5,
) => {
  doc.roundedRect(x, y, w, h, r, r, style);
};

/** Dibuja una sola línea; si no cabe, recorta con “…”. Evita wrap que se empalma. */
const textOneLine = (
  doc: JsPDFDoc,
  value: string,
  x: number,
  y: number,
  opts: {
    size?: number;
    bold?: boolean;
    color?: Rgb;
    align?: "left" | "center" | "right";
    maxW: number;
  },
) => {
  setText(doc, opts.color ?? INK);
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(opts.size ?? 9);
  let output = value;
  const ellipsis = "…";
  while (output.length > 1 && doc.getTextWidth(output) > opts.maxW) {
    output = output.slice(0, -1);
  }
  if (output !== value) {
    while (output.length > 1 && doc.getTextWidth(`${output}${ellipsis}`) > opts.maxW) {
      output = output.slice(0, -1);
    }
    output = `${output}${ellipsis}`;
  }
  doc.text(output, x, y, { align: opts.align ?? "left" });
};

const text = (
  doc: JsPDFDoc,
  value: string,
  x: number,
  y: number,
  opts?: {
    size?: number;
    bold?: boolean;
    color?: Rgb;
    align?: "left" | "center" | "right";
    maxW?: number;
  },
): number => {
  setText(doc, opts?.color ?? INK);
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.setFontSize(opts?.size ?? 9);
  if (opts?.maxW) {
    const lines = doc.splitTextToSize(value, opts.maxW) as string[];
    doc.text(lines, x, y, { align: opts?.align ?? "left" });
    return lines.length;
  }
  doc.text(value, x, y, { align: opts?.align ?? "left" });
  return 1;
};

const caps = (
  doc: JsPDFDoc,
  value: string,
  x: number,
  y: number,
  opts?: { size?: number; color?: Rgb; align?: "left" | "center" | "right"; maxW?: number },
) => {
  text(doc, value.toUpperCase(), x, y, {
    size: opts?.size ?? 5.5,
    bold: true,
    color: opts?.color ?? MUTED,
    align: opts?.align,
    maxW: opts?.maxW,
  });
};

const resolveTipologia = (
  simulacion: MisionLaGaviaSimulacionResult,
  recamaras?: number,
): GaviaTipologia => {
  if (recamaras != null) {
    return recamaras >= 3 ? "3R" : "2R";
  }
  const modelo = simulacion.modelo.toUpperCase();
  if (modelo.includes("3R") || modelo.includes("3 R")) {
    return "3R";
  }
  return "2R";
};

const drawFittedImage = (
  doc: JsPDFDoc,
  asset: ImageAsset,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  pad = 2,
) => {
  const innerW = Math.max(1, boxW - pad * 2);
  const innerH = Math.max(1, boxH - pad * 2);
  const scale = Math.min(innerW / asset.width, innerH / asset.height);
  const drawW = Math.min(innerW, asset.width * scale);
  const drawH = Math.min(innerH, asset.height * scale);
  doc.addImage(
    asset.dataUrl,
    asset.format,
    boxX + (boxW - drawW) / 2,
    boxY + (boxH - drawH) / 2,
    drawW,
    drawH,
  );
};

const drawHeader = (
  doc: JsPDFDoc,
  y: number,
  contentW: number,
  input: MisionLaGaviaSimuladorPdfInput,
  logo: ImageAsset | null,
  fechaDoc: string,
): number => {
  const h = 30;
  const left = PAGE.marginX + 4;
  const right = PAGE.marginX + contentW - 4;

  setFill(doc, INK);
  roundedRect(doc, PAGE.marginX, y, contentW, h, "F", 2);

  const logoBoxW = 28;
  const logoBoxH = 16;
  const logoX = left;
  const logoY = y + 3;
  setFill(doc, CREAM);
  roundedRect(doc, logoX, logoY, logoBoxW, logoBoxH, "F", 1.4);

  if (logo) {
    try {
      drawFittedImage(doc, logo, logoX, logoY, logoBoxW, logoBoxH, 1);
    } catch {
      text(doc, "Gavia", logoX + logoBoxW / 2, logoY + logoBoxH / 2 + 1, {
        size: 6,
        bold: true,
        color: INK,
        align: "center",
      });
    }
  }

  const titleX = logoX + logoBoxW + 3.5;
  const titleMaxW = contentW * 0.48;
  caps(doc, "Cotización", titleX, y + 6.5, { color: ACCENT, size: 5 });
  text(doc, input.desarrolloNombre, titleX, y + 12, {
    size: 10,
    bold: true,
    color: WHITE,
    maxW: titleMaxW,
  });
  text(doc, "Lista mar26", titleX, y + 17, {
    size: 6,
    color: MUTED_ON_DARK,
  });

  caps(doc, "Elaboración", right, y + 6.5, {
    color: MUTED_ON_DARK,
    size: 5,
    align: "right",
  });
  text(doc, fechaDoc, right, y + 12, {
    size: 7,
    color: WHITE,
    align: "right",
    maxW: 42,
  });

  // Franja inferior: cliente | asesor en mitades claras (sin empalme)
  setFill(doc, INK_DEEP);
  doc.rect(PAGE.marginX, y + h - 10, contentW, 10, "F");
  const mid = PAGE.marginX + contentW / 2;
  const cliente = input.clienteNombre?.trim() || "Sin nombre";
  const asesor = input.asesorNombre?.trim();

  caps(doc, "En atención a", left, y + h - 7, { color: MUTED_ON_DARK, size: 4.5 });
  textOneLine(doc, cliente, left, y + h - 2.8, {
    size: 8,
    bold: true,
    color: WHITE,
    maxW: contentW / 2 - 12,
  });

  if (asesor) {
    caps(doc, "Asesor", right, y + h - 7, {
      color: MUTED_ON_DARK,
      size: 4.5,
      align: "right",
    });
    textOneLine(doc, asesor, right, y + h - 2.8, {
      size: 7.5,
      bold: true,
      color: WHITE,
      align: "right",
      maxW: contentW / 2 - 12,
    });
  }

  // Separador vertical sutil entre columnas
  setDraw(doc, [40, 90, 80]);
  doc.setLineWidth(0.2);
  doc.line(mid, y + h - 8.5, mid, y + h - 1.5);

  return y + h + 3.5;
};

const drawPageFooter = (
  doc: JsPDFDoc,
  contentW: number,
  footerTop: number,
  left: number,
  label: string,
) => {
  setFill(doc, SLATE_50);
  roundedRect(doc, PAGE.marginX, footerTop, contentW, PAGE.footerH, "F", 1.5);
  text(doc, label, left, footerTop + 6.2, {
    size: 6,
    color: MUTED,
    maxW: contentW - 7,
  });
};

/** Página 2: planta (compacta) + términos — máximo 2 páginas en total. */
const drawPlantasYTerminosPage = (
  doc: JsPDFDoc,
  input: MisionLaGaviaSimuladorPdfInput,
  planta: ImageAsset | null,
  roof: ImageAsset | null,
) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - PAGE.marginX * 2;
  const left = PAGE.marginX + 3.5;
  const s = input.simulacion;
  const footerTop = pageH - PAGE.marginBottom - PAGE.footerH;

  doc.addPage();
  let y = PAGE.marginTop;

  setFill(doc, CREAM);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.15);
  roundedRect(doc, PAGE.marginX, y, contentW, 12, "FD", 1.5);
  caps(doc, "Anexo", left, y + 4.2, { color: ACCENT, size: 5 });
  text(doc, `${s.unidad} · ${s.modelo}`, left, y + 9.2, { size: 9, bold: true });
  text(
    doc,
    `Edif. ${s.edificio} · ${s.lado}`,
    PAGE.marginX + contentW - 3.5,
    y + 9.2,
    { size: 7, color: MUTED, align: "right", maxW: contentW * 0.4 },
  );
  y += 15;

  const terminosReserve = 78;
  const usableForPlanta = Math.max(36, footerTop - y - terminosReserve - 4);
  const hasRoof = Boolean(roof && planta);

  if (planta || roof) {
    if (hasRoof && planta && roof) {
      const gap = 2.5;
      const colW = (contentW - gap) / 2;
      const boxH = Math.min(usableForPlanta, 95);
      caps(doc, "Planta", left, y, { color: ACCENT, size: 4.5 });
      caps(doc, "Roof garden", left + colW + gap, y, { color: ACCENT, size: 4.5 });
      y += 2.5;
      setFill(doc, WHITE);
      setDraw(doc, BORDER);
      roundedRect(doc, PAGE.marginX, y, colW, boxH, "FD", 1.2);
      roundedRect(doc, PAGE.marginX + colW + gap, y, colW, boxH, "FD", 1.2);
      try {
        drawFittedImage(doc, planta, PAGE.marginX, y, colW, boxH, 2.5);
      } catch {
        // opcional
      }
      try {
        drawFittedImage(doc, roof, PAGE.marginX + colW + gap, y, colW, boxH, 2.5);
      } catch {
        // opcional
      }
      y += boxH + 3;
    } else if (planta) {
      const boxH = Math.min(usableForPlanta, 100);
      caps(doc, "Planta arquitectónica", left, y, { color: ACCENT, size: 4.5 });
      y += 2.5;
      setFill(doc, WHITE);
      setDraw(doc, BORDER);
      roundedRect(doc, PAGE.marginX, y, contentW, boxH, "FD", 1.2);
      try {
        drawFittedImage(doc, planta, PAGE.marginX, y, contentW, boxH, 3);
      } catch {
        // opcional
      }
      y += boxH + 3;
    }
  }

  setFill(doc, CREAM);
  setDraw(doc, BORDER);
  roundedRect(doc, PAGE.marginX, y, contentW, 10, "FD", 1.2);
  caps(doc, "Cotización", left, y + 3.5, { color: ACCENT, size: 4.5 });
  text(doc, "Términos y condiciones", left, y + 7.8, { size: 8.5, bold: true });
  y += 12;

  const lineH = 3.2;
  const fontSize = 6.5;
  MISION_LA_GAVIA_TERMINOS_CONDICIONES.forEach((line, index) => {
    const maxW = contentW - 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const parts = doc.splitTextToSize(line, maxW) as string[];
    const blockH = parts.length * lineH + 1.8;
    if (y + blockH > footerTop - 2) {
      return;
    }
    text(doc, `${index + 1}.`, left, y + 2.4, { size: fontSize, bold: true, color: INK });
    parts.forEach((part, lineIndex) => {
      text(doc, part, left + 5, y + 2.4 + lineIndex * lineH, {
        size: fontSize,
        color: MUTED,
      });
    });
    y += blockH;
  });

  drawPageFooter(
    doc,
    contentW,
    footerTop,
    left,
    "Documento informativo · GABI · Misión La Gavia · BBR Habitarea",
  );
};

const drawTerminosOnlyPage = (doc: JsPDFDoc, input: MisionLaGaviaSimuladorPdfInput) => {
  drawPlantasYTerminosPage(doc, input, null, null);
};

const drawPlanTableHeader = (
  doc: JsPDFDoc,
  y: number,
  left: number,
  right: number,
  esquemaLabel: string,
  cols: { no: number; fecha: number; concepto: number },
) => {
  caps(doc, `Plan de pagos — ${esquemaLabel}`, left, y + 4, { size: 5.5 });
  text(doc, "No.", cols.no, y + 9.2, { size: 6, color: MUTED });
  text(doc, "Fecha", cols.fecha, y + 9.2, { size: 6, color: MUTED });
  text(doc, "Concepto", cols.concepto, y + 9.2, { size: 6, color: MUTED });
  text(doc, "Pago", right, y + 9.2, { size: 6, color: MUTED, align: "right" });
  setDraw(doc, BORDER);
  doc.setLineWidth(0.2);
  doc.line(left, y + 11.2, right, y + 11.2);
};

/** Si el plan es largo, resume mensualidades intermedias en una sola fila. */
const condenseCalendarioForPdf = (
  calendario: MisionLaGaviaFilaPago[],
  maxRows: number,
): MisionLaGaviaFilaPago[] => {
  if (calendario.length <= maxRows || calendario.length < 4) {
    return calendario;
  }

  const first = calendario[0];
  const last = calendario[calendario.length - 1];
  const middle = calendario.slice(1, -1);
  if (!first || !last || !middle.length) {
    return calendario;
  }

  const pagoMensual = middle[0]?.pagoTotal ?? 0;
  const mismoMonto = middle.every((fila) => Math.abs(fila.pagoTotal - pagoMensual) < 0.01);
  const desde = formatMonthYear(middle[0]!.fechaPago);
  const hasta = formatMonthYear(middle[middle.length - 1]!.fechaPago);
  const conceptoMiddle = mismoMonto
    ? `Mensualidades ×${middle.length} · ${formatPrice(pagoMensual)} c/u (${desde}–${hasta})`
    : `Mensualidades ×${middle.length} (${desde}–${hasta})`;

  return [
    { ...first, numero: 1 },
    {
      numero: 2,
      fechaPago: middle[0]!.fechaPago,
      concepto: conceptoMiddle,
      pagoTotal: middle.reduce((sum, fila) => sum + fila.pagoTotal, 0),
      tipo: "mensualidad" as const,
    },
    { ...last, numero: 3 },
  ];
};

const drawCalendarioPagos = (
  doc: JsPDFDoc,
  calendario: MisionLaGaviaFilaPago[],
  startY: number,
  contentW: number,
  left: number,
  right: number,
  footerTop: number,
  esquemaLabel: string,
  precioTotal: number,
): number => {
  const cols = {
    no: left,
    fecha: left + 10,
    concepto: left + 36,
  };
  const conceptoMaxW = Math.max(40, contentW - 78);
  /** Título + encabezados + línea; primera fila empieza debajo. */
  const headerBlock = 14;
  const totalBlock = 7;
  const y = startY;
  const available = Math.max(24, footerTop - y - 4);

  let rowH = 5.2;
  let maxRowsFit = Math.max(
    1,
    Math.floor((available - headerBlock - totalBlock) / rowH),
  );
  let rows = condenseCalendarioForPdf(calendario, maxRowsFit);

  if (rows.length > maxRowsFit) {
    rowH = Math.max(4, (available - headerBlock - totalBlock) / rows.length);
    maxRowsFit = Math.max(1, Math.floor((available - headerBlock - totalBlock) / rowH));
    rows = condenseCalendarioForPdf(calendario, maxRowsFit);
  }

  const rowsHere = Math.min(rows.length, maxRowsFit);
  const boxH = headerBlock + rowsHere * rowH + totalBlock;

  setFill(doc, WHITE);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.15);
  roundedRect(doc, PAGE.marginX, y, contentW, boxH, "FD", 1.5);
  drawPlanTableHeader(doc, y, left, right, esquemaLabel, cols);

  let rowY = y + headerBlock + rowH * 0.72;
  for (let r = 0; r < rowsHere; r += 1) {
    const fila = rows[r];
    if (!fila) continue;
    const bandTop = y + headerBlock + r * rowH;
    if (r % 2 === 1) {
      setFill(doc, SLATE_50);
      doc.rect(PAGE.marginX + 1.2, bandTop, contentW - 2.4, rowH, "F");
    }

    text(doc, String(fila.numero), cols.no, rowY, { size: 7.5 });
    textOneLine(doc, formatMonthYear(fila.fechaPago), cols.fecha, rowY, {
      size: 7.5,
      maxW: 24,
    });
    textOneLine(doc, fila.concepto, cols.concepto, rowY, {
      size: 7.5,
      maxW: conceptoMaxW,
    });
    textOneLine(doc, formatPrice(fila.pagoTotal), right, rowY, {
      size: 7.5,
      bold: true,
      align: "right",
      maxW: 36,
    });
    rowY += rowH;
  }

  const totalY = y + headerBlock + rowsHere * rowH + 4.5;
  text(doc, "Total plan", cols.concepto, totalY, {
    size: 7.5,
    color: MUTED,
  });
  textOneLine(doc, formatPrice(precioTotal), right, totalY, {
    size: 8.5,
    bold: true,
    align: "right",
    maxW: 40,
  });
  return y + boxH + 2.5;
};

export async function downloadMisionLaGaviaSimuladorPdf(
  input: MisionLaGaviaSimuladorPdfInput,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const s = input.simulacion;

  const decoded = decodeMisionLaGaviaUnidad(s.unidad);
  const tipologia = resolveTipologia(s, input.recamaras);
  const plantaAssets = decoded
    ? resolveGaviaPlantaAssets(tipologia, decoded.lado, decoded.nivel)
    : null;

  const [logo, planta, roof] = await Promise.all([
    loadImageAsset(resolveGaviaLogoForPdf(input.desarrolloLogo)),
    plantaAssets ? loadImageAsset(plantaAssets.plantaSrc) : Promise.resolve(null),
    plantaAssets?.roofSrc ? loadImageAsset(plantaAssets.roofSrc) : Promise.resolve(null),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - PAGE.marginX * 2;
  const left = PAGE.marginX + 3.5;
  const right = PAGE.marginX + contentW - 3.5;
  const footerTop = pageH - PAGE.marginBottom - PAGE.footerH;

  const fechaDoc = new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let y = drawHeader(doc, PAGE.marginTop, contentW, input, logo, fechaDoc);

  // Unidad
  setFill(doc, SLATE_50);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.15);
  roundedRect(doc, PAGE.marginX, y, contentW, 20, "FD", 1.5);
  caps(doc, "Unidad", left, y + 4.5, { color: ACCENT, size: 5 });
  text(doc, `Departamento ${s.unidad}`, left, y + 10, { size: 11, bold: true });
  const specs: string[] = [
    s.modelo,
    `Edif. ${s.edificio}`,
    s.lado,
    formatAreaM2(s.m2Totales) || `${s.m2Totales} m²`,
  ];
  if (input.recamaras) specs.push(`${input.recamaras} rec.`);
  if (s.entregaLabel) specs.push(`Entrega ${s.entregaLabel}`);
  text(doc, specs.join("  ·  "), left, y + 15.5, {
    size: 7.5,
    color: MUTED,
    maxW: contentW - 8,
  });
  y += 23;

  // Precios
  const priceH = 15;
  const listaW = contentW * 0.38;
  const totalW = contentW - listaW - PAGE.gap;
  setFill(doc, ACCENT);
  roundedRect(doc, PAGE.marginX, y, listaW, priceH, "F", 1.5);
  caps(doc, "Precio lista", left, y + 4.2, { color: WHITE, size: 5 });
  text(doc, formatPrice(s.precioLista), left, y + 10.8, {
    size: 10,
    bold: true,
    color: WHITE,
  });

  setFill(doc, INK);
  roundedRect(doc, PAGE.marginX + listaW + PAGE.gap, y, totalW, priceH, "F", 1.5);
  caps(doc, `Total ${s.esquemaLabel}`, PAGE.marginX + listaW + PAGE.gap + 3.5, y + 4.2, {
    color: WHITE,
    size: 5,
  });
  text(doc, formatPrice(s.precioTotal), PAGE.marginX + listaW + PAGE.gap + 3.5, y + 10.8, {
    size: 11,
    bold: true,
    color: WHITE,
  });
  y += priceH + 2.5;

  const metaBits = [
    `Desc. vs lista ${formatPctShort(s.descuentoVsListaPct)}`,
    s.descuentoEspecialPct && s.descuentoEspecialPct > 0
      ? `Especial ${formatPctShort(s.descuentoEspecialPct)}`
      : null,
    `Renta ref. ${formatPrice(s.rentaMensual)}/mes · ~${formatPctShort(s.rendimientoRentasAnual)} anual`,
  ].filter(Boolean);
  text(doc, metaBits.join("  ·  "), left, y + 3, {
    size: 7,
    color: MUTED,
    maxW: contentW - 7,
  });
  y += 8;

  const calendario = buildCalendarioPagosMisionLaGavia(s, {
    diaPago: input.diaPago ?? MISION_LA_GAVIA_DIA_PAGO_DEFAULT,
  });

  y = drawCalendarioPagos(
    doc,
    calendario,
    y,
    contentW,
    left,
    right,
    footerTop,
    s.esquemaLabel,
    s.precioTotal,
  );

  const continueHint =
    planta || roof
      ? "Vigencia 10 días · Planta y términos en la página siguiente."
      : "Vigencia 10 días naturales · Valores referenciales · Ver términos al final.";

  drawPageFooter(doc, contentW, footerTop, left, continueHint);

  if (planta || roof) {
    drawPlantasYTerminosPage(doc, input, planta, roof);
  } else {
    drawTerminosOnlyPage(doc, input);
  }

  const fileName = `cotizacion-gavia-${s.unidad}-${slugify(input.clienteNombre ?? "prospecto")}.pdf`;
  doc.save(fileName);
}
