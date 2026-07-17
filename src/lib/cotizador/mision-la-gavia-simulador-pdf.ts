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

type PdfPlanRow = {
  concepto: string;
  periodo: string;
  detalle: string;
  monto: string;
  emphasize?: boolean;
};

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
) => {
  setText(doc, opts?.color ?? INK);
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.setFontSize(opts?.size ?? 9);
  if (opts?.maxW) {
    const lines = doc.splitTextToSize(value, opts.maxW);
    doc.text(lines, x, y, { align: opts?.align ?? "left" });
    return lines.length as number;
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

/** Resume mensualidades idénticas en una sola fila (ahorra ~15 líneas en Libre/MSI). */
const buildCompactPlanRows = (
  calendario: MisionLaGaviaFilaPago[],
  esquemaLabel: string,
): PdfPlanRow[] => {
  const rows: PdfPlanRow[] = [];
  let i = 0;
  while (i < calendario.length) {
    const fila = calendario[i];
    if (fila.tipo === "mensualidad") {
      let j = i;
      while (
        j + 1 < calendario.length &&
        calendario[j + 1].tipo === "mensualidad" &&
        Math.abs(calendario[j + 1].pagoTotal - fila.pagoTotal) < 0.01
      ) {
        j += 1;
      }
      const count = j - i + 1;
      const first = calendario[i];
      const last = calendario[j];
      const totalMens = fila.pagoTotal * count;
      rows.push({
        concepto: count === 1 ? "Mensualidad" : `${count} mensualidades`,
        periodo:
          count === 1
            ? formatMonthYear(first.fechaPago)
            : `${formatMonthYear(first.fechaPago)} – ${formatMonthYear(last.fechaPago)}`,
        detalle: `${formatPrice(fila.pagoTotal)} c/u`,
        monto: formatPrice(totalMens),
      });
      i = j + 1;
      continue;
    }

    rows.push({
      concepto: fila.tipo === "enganche" ? "Enganche" : fila.tipo === "finiquito" ? "Finiquito" : fila.concepto,
      periodo: formatMonthYear(fila.fechaPago),
      detalle: fila.concepto.replace(/^(Enganche|Finiquito)\s+/i, "").trim() || esquemaLabel,
      monto: formatPrice(fila.pagoTotal),
      emphasize: fila.tipo === "enganche" || fila.tipo === "finiquito",
    });
    i += 1;
  }
  return rows;
};

const shortDescripcion = (s: MisionLaGaviaSimulacionResult): string => {
  const raw = s.descripcionPago?.trim() ?? "";
  if (!raw) return s.esquemaLabel;
  // Quita el pie didáctico largo; basta la fórmula comercial.
  const cut = raw.split(". Los porcentajes")[0]?.trim() ?? raw;
  return cut.length > 160 ? `${cut.slice(0, 157)}…` : cut;
};

const drawHeader = (
  doc: JsPDFDoc,
  y: number,
  contentW: number,
  input: MisionLaGaviaSimuladorPdfInput,
  logo: ImageAsset | null,
  fechaDoc: string,
): number => {
  const h = 28;
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
  caps(doc, "Cotización", titleX, y + 6, { color: ACCENT, size: 5 });
  text(doc, input.desarrolloNombre, titleX, y + 11.5, {
    size: 10,
    bold: true,
    color: WHITE,
    maxW: contentW * 0.45,
  });
  text(doc, "Lista mar26", titleX, y + 16.5, {
    size: 6,
    color: MUTED_ON_DARK,
  });

  caps(doc, "Elaboración", right, y + 6, {
    color: MUTED_ON_DARK,
    size: 5,
    align: "right",
  });
  text(doc, fechaDoc, right, y + 11, {
    size: 7,
    color: WHITE,
    align: "right",
  });

  setFill(doc, INK_DEEP);
  doc.rect(PAGE.marginX, y + h - 9, contentW, 9, "F");
  const cliente = input.clienteNombre?.trim() || "Sin nombre";
  text(doc, cliente, left, y + h - 3.2, {
    size: 8.5,
    bold: true,
    color: WHITE,
    maxW: contentW * 0.55,
  });
  if (input.asesorNombre?.trim()) {
    text(doc, `Asesor · ${input.asesorNombre.trim()}`, right, y + h - 3.2, {
      size: 7,
      color: MUTED_ON_DARK,
      align: "right",
      maxW: contentW * 0.4,
    });
  }

  return y + h + 3.5;
};

const drawPlantasAndTerminosPage = (
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

  doc.addPage();
  let y = PAGE.marginTop;

  // Cabecera compacta
  setFill(doc, CREAM);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.15);
  roundedRect(doc, PAGE.marginX, y, contentW, 12, "FD", 1.5);
  text(doc, `${s.unidad} · ${s.modelo}`, left, y + 5, { size: 9, bold: true });
  text(
    doc,
    `Edificio ${s.edificio} · ${s.lado}${s.entregaLabel ? ` · Entrega ${s.entregaLabel}` : ""}`,
    PAGE.marginX + contentW - 3.5,
    y + 5,
    { size: 7, color: MUTED, align: "right", maxW: contentW * 0.48 },
  );
  text(doc, "Planta · Términos", left, y + 9.5, { size: 6, color: ACCENT });
  y += 15;

  const terminosReserve = 72;
  const usableH = pageH - y - PAGE.marginBottom - terminosReserve - 4;
  const hasRoof = Boolean(roof && planta);

  if (!planta && !roof) {
    setFill(doc, SLATE_50);
    roundedRect(doc, PAGE.marginX, y, contentW, 28, "F", 1.5);
    text(doc, "Planta no disponible para esta unidad.", left, y + 15, {
      size: 8,
      color: MUTED,
    });
    y += 32;
  } else if (hasRoof && planta && roof) {
    const gap = 3;
    const colW = (contentW - gap) / 2;
    const boxH = Math.min(usableH, 118);
    caps(doc, "Planta", left, y, { color: ACCENT, size: 5 });
    caps(doc, "Roof garden", left + colW + gap, y, { color: ACCENT, size: 5 });
    y += 2.5;
    setFill(doc, WHITE);
    setDraw(doc, BORDER);
    roundedRect(doc, PAGE.marginX, y, colW, boxH, "FD", 1.5);
    roundedRect(doc, PAGE.marginX + colW + gap, y, colW, boxH, "FD", 1.5);
    try {
      drawFittedImage(doc, planta, PAGE.marginX, y, colW, boxH, 3);
    } catch {
      // opcional
    }
    try {
      drawFittedImage(doc, roof, PAGE.marginX + colW + gap, y, colW, boxH, 3);
    } catch {
      // opcional
    }
    y += boxH + 4;
  } else if (planta) {
    const boxH = Math.min(usableH, 130);
    caps(doc, "Planta arquitectónica", left, y, { color: ACCENT, size: 5 });
    y += 2.5;
    setFill(doc, WHITE);
    setDraw(doc, BORDER);
    roundedRect(doc, PAGE.marginX, y, contentW, boxH, "FD", 1.5);
    try {
      drawFittedImage(doc, planta, PAGE.marginX, y, contentW, boxH, 4);
    } catch {
      // opcional
    }
    y += boxH + 4;
  }

  // Términos en la misma página (tipografía densa)
  caps(doc, "Términos y condiciones", left, y + 2, { color: ACCENT, size: 5.5 });
  y += 5.5;

  const termBlocks: string[][] = MISION_LA_GAVIA_TERMINOS_CONDICIONES.map((line, index) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    return doc.splitTextToSize(`${index + 1}. ${line}`, contentW - 10) as string[];
  });
  const termsInnerH =
    termBlocks.reduce((sum, parts) => sum + parts.length * 3.1 + 1.1, 0) + 4;
  const termsH = Math.min(termsInnerH, pageH - y - PAGE.marginBottom - 8);

  setFill(doc, SLATE_50);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.15);
  roundedRect(doc, PAGE.marginX, y, contentW, termsH, "FD", 1.5);

  let ty = y + 4;
  for (const parts of termBlocks) {
    const blockH = parts.length * 3.1;
    if (ty + blockH > y + termsH - 2) break;
    parts.forEach((part, lineIndex) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      setText(doc, MUTED);
      doc.text(part, left, ty + lineIndex * 3.1);
    });
    ty += blockH + 1.1;
  }

  text(
    doc,
    "Documento informativo · GABI · Misión La Gavia · BBR Habitarea",
    left,
    Math.min(pageH - PAGE.marginBottom - 2, y + termsH + 4.5),
    { size: 6, color: MUTED, maxW: contentW - 6 },
  );
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

  // Unidad + specs en una sola franja
  setFill(doc, SLATE_50);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.15);
  roundedRect(doc, PAGE.marginX, y, contentW, 22, "FD", 1.5);
  caps(doc, "Unidad", left, y + 4.5, { color: ACCENT, size: 5 });
  text(doc, `Departamento ${s.unidad}`, left, y + 10, { size: 11, bold: true });

  const specs: string[] = [
    s.modelo,
    `Edif. ${s.edificio}`,
    s.lado,
    formatAreaM2(s.m2Totales) || `${s.m2Totales} m²`,
  ];
  if (input.recamaras) specs.push(`${input.recamaras}R`);
  if (s.entregaLabel) specs.push(`Entrega ${s.entregaLabel}`);
  text(doc, specs.join("  ·  "), left, y + 16.5, {
    size: 7.5,
    color: MUTED,
    maxW: contentW - 8,
  });
  y += 25;

  // Precios
  const priceH = 16;
  const listaW = contentW * 0.38;
  const totalW = contentW - listaW - PAGE.gap;
  setFill(doc, ACCENT);
  roundedRect(doc, PAGE.marginX, y, listaW, priceH, "F", 1.5);
  caps(doc, "Precio lista", left, y + 4.5, { color: WHITE, size: 5 });
  text(doc, formatPrice(s.precioLista), left, y + 11.5, {
    size: 10,
    bold: true,
    color: WHITE,
  });

  setFill(doc, INK);
  roundedRect(doc, PAGE.marginX + listaW + PAGE.gap, y, totalW, priceH, "F", 1.5);
  caps(doc, `Total ${s.esquemaLabel}`, PAGE.marginX + listaW + PAGE.gap + 3.5, y + 4.5, {
    color: WHITE,
    size: 5,
  });
  text(doc, formatPrice(s.precioTotal), PAGE.marginX + listaW + PAGE.gap + 3.5, y + 11.5, {
    size: 11,
    bold: true,
    color: WHITE,
  });
  y += priceH + 2.5;

  // Meta comercial en una línea
  const metaBits = [
    `Desc. vs lista ${formatPctShort(s.descuentoVsListaPct)}`,
    s.descuentoEspecialPct && s.descuentoEspecialPct > 0
      ? `Especial ${formatPctShort(s.descuentoEspecialPct)}`
      : null,
    `Renta ref. ${formatPrice(s.rentaMensual)}/mes`,
    `~${formatPctShort(s.rendimientoRentasAnual)} anual`,
  ].filter(Boolean);
  text(doc, metaBits.join("  ·  "), left, y + 3, {
    size: 7,
    color: MUTED,
    maxW: contentW - 7,
  });
  y += 7;

  text(doc, shortDescripcion(s), left, y + 2, {
    size: 7,
    color: MUTED,
    maxW: contentW - 7,
  });
  y += 8;

  // Plan compacto
  const calendario = buildCalendarioPagosMisionLaGavia(s, {
    diaPago: input.diaPago ?? MISION_LA_GAVIA_DIA_PAGO_DEFAULT,
  });
  const planRows = buildCompactPlanRows(calendario, s.esquemaLabel);
  const rowH = 6.2;
  const headerH = 8;
  const payH = headerH + planRows.length * rowH + 8;

  setFill(doc, WHITE);
  setDraw(doc, BORDER);
  roundedRect(doc, PAGE.marginX, y, contentW, payH, "FD", 1.5);
  caps(doc, `Plan de pagos — ${s.esquemaLabel}`, left, y + 5, { size: 5.5 });

  const colConcepto = left;
  const colPeriodo = left + 42;
  const colDetalle = left + 78;
  text(doc, "Concepto", colConcepto, y + 9.5, { size: 6, color: MUTED });
  text(doc, "Periodo", colPeriodo, y + 9.5, { size: 6, color: MUTED });
  text(doc, "Detalle", colDetalle, y + 9.5, { size: 6, color: MUTED });
  text(doc, "Monto", right, y + 9.5, { size: 6, color: MUTED, align: "right" });

  planRows.forEach((row, index) => {
    const py = y + headerH + 3 + index * rowH;
    if (index % 2 === 1) {
      setFill(doc, SLATE_50);
      doc.rect(PAGE.marginX + 1, py - 3.5, contentW - 2, rowH, "F");
    }
    text(doc, row.concepto, colConcepto, py, {
      size: 8,
      bold: Boolean(row.emphasize),
      maxW: 40,
    });
    text(doc, row.periodo, colPeriodo, py, { size: 7.5, color: MUTED, maxW: 34 });
    text(doc, row.detalle, colDetalle, py, { size: 7, color: MUTED, maxW: contentW - 110 });
    text(doc, row.monto, right, py, {
      size: 8,
      bold: true,
      align: "right",
    });
  });

  // Total del plan
  const totalY = y + headerH + planRows.length * rowH + 4;
  text(doc, "Total plan", colConcepto, totalY, { size: 7.5, color: MUTED });
  text(doc, formatPrice(s.precioTotal), right, totalY, {
    size: 9,
    bold: true,
    align: "right",
  });
  y += payH + 3;

  if (planta || roof) {
    setFill(doc, CREAM);
    setDraw(doc, BORDER);
    roundedRect(doc, PAGE.marginX, y, contentW, 9, "FD", 1.5);
    text(
      doc,
      roof
        ? "Página siguiente: planta arquitectónica, roof garden y términos."
        : "Página siguiente: planta arquitectónica y términos.",
      left,
      y + 5.8,
      { size: 7, color: INK, maxW: contentW - 7 },
    );
  }

  setFill(doc, SLATE_50);
  roundedRect(doc, PAGE.marginX, footerTop, contentW, PAGE.footerH, "F", 1.5);
  text(
    doc,
    "Vigencia 10 días naturales · Valores referenciales · No constituye preaprobación",
    left,
    footerTop + 6.2,
    { size: 6, color: MUTED, maxW: contentW - 7 },
  );

  if (planta || roof) {
    drawPlantasAndTerminosPage(doc, input, planta, roof);
  } else {
    // Sin planta: términos en página 2 compacta
    drawPlantasAndTerminosPage(doc, input, null, null);
  }

  const fileName = `cotizacion-gavia-${s.unidad}-${slugify(input.clienteNombre ?? "prospecto")}.pdf`;
  doc.save(fileName);
}
