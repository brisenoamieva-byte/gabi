import { formatPrice } from "@/lib/data";
import { formatAreaM2 } from "@/lib/format/money";
import { formatMonthYear } from "@/lib/cotizador/pasaje-simulador";
import { formatPctShort } from "@/lib/corredor/mision-la-gavia-simulador";
import type { MisionLaGaviaSimulacionResult } from "@/lib/corredor/mision-la-gavia-simulador-data-types";
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
  marginX: 14,
  marginTop: 12,
  marginBottom: 10,
  footerH: 20,
  gap: 3.5,
} as const;

const DISCLAIMERS = [
  "Vigencia de una semana, sujeto a cambio sin previo aviso.",
  "Valores referenciales. Esta cotización no constituye preaprobación ni compromiso de apartado.",
];

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
  r = 2,
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
    return;
  }
  doc.text(value, x, y, { align: opts?.align ?? "left" });
};

const caps = (
  doc: JsPDFDoc,
  value: string,
  x: number,
  y: number,
  opts?: { size?: number; color?: Rgb; align?: "left" | "center" | "right"; maxW?: number },
) => {
  text(doc, value.toUpperCase(), x, y, {
    size: opts?.size ?? 6,
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
  const scale = Math.min((boxW - pad * 2) / asset.width, (boxH - pad * 2) / asset.height);
  const drawW = asset.width * scale;
  const drawH = asset.height * scale;
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
  const h = 34;
  const left = PAGE.marginX + 5;
  const right = PAGE.marginX + contentW - 5;

  setFill(doc, INK);
  roundedRect(doc, PAGE.marginX, y, contentW, h, "F", 2.5);
  setFill(doc, INK_DEEP);
  doc.rect(PAGE.marginX, y + h - 12, contentW, 12, "F");

  // Logo sobre placa crema: el isotipo Gavia (verde) se lee bien; no se pierde en el verde del header.
  const logoBoxW = 42;
  const logoBoxH = 14;
  const logoX = left;
  const logoY = y + 4;
  setFill(doc, CREAM);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.15);
  roundedRect(doc, logoX, logoY, logoBoxW, logoBoxH, "FD", 1.8);

  if (logo) {
    try {
      drawFittedImage(doc, logo, logoX, logoY, logoBoxW, logoBoxH, 2.5);
    } catch {
      text(doc, "Misión La Gavia", logoX + logoBoxW / 2, logoY + logoBoxH / 2 + 1, {
        size: 6,
        bold: true,
        color: INK,
        align: "center",
        maxW: logoBoxW - 2,
      });
    }
  } else {
    text(doc, "Misión La Gavia", logoX + logoBoxW / 2, logoY + logoBoxH / 2 + 1, {
      size: 6,
      bold: true,
      color: INK,
      align: "center",
      maxW: logoBoxW - 2,
    });
  }

  const titleX = logoX + logoBoxW + 4;
  const dateW = 40;
  const titleMaxW = right - titleX - dateW - 2;

  caps(doc, "Cotización", titleX, y + 7, { color: ACCENT, size: 5.5 });
  text(doc, input.desarrolloNombre, titleX, y + 12.5, {
    size: 11,
    bold: true,
    color: WHITE,
    maxW: titleMaxW,
  });
  text(doc, "Simulador lista mar26", titleX, y + 17.5, {
    size: 6.5,
    color: MUTED_ON_DARK,
    maxW: titleMaxW,
  });

  caps(doc, "Elaboración", right, y + 7, {
    color: MUTED_ON_DARK,
    size: 5.5,
    align: "right",
    maxW: dateW,
  });
  text(doc, fechaDoc, right, y + 12.5, {
    size: 7.5,
    color: WHITE,
    align: "right",
    maxW: dateW,
  });

  caps(doc, "En atención a", left, y + h - 8.5, { color: MUTED_ON_DARK, size: 5.5 });
  text(doc, input.clienteNombre?.trim() || "Sin nombre", left, y + h - 3.5, {
    size: 9.5,
    bold: true,
    color: WHITE,
    maxW: contentW * 0.55,
  });

  if (input.asesorNombre?.trim()) {
    caps(doc, "Asesor", right, y + h - 8.5, {
      color: MUTED_ON_DARK,
      size: 5.5,
      align: "right",
    });
    text(doc, input.asesorNombre.trim(), right, y + h - 3.5, {
      size: 8,
      bold: true,
      color: WHITE,
      align: "right",
      maxW: contentW * 0.4,
    });
  }

  return y + h + 5;
};

const drawPlantasPage = (
  doc: JsPDFDoc,
  input: MisionLaGaviaSimuladorPdfInput,
  planta: ImageAsset | null,
  roof: ImageAsset | null,
) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - PAGE.marginX * 2;
  const left = PAGE.marginX + 4;
  const s = input.simulacion;

  doc.addPage();
  let y = PAGE.marginTop;

  setFill(doc, CREAM);
  roundedRect(doc, PAGE.marginX, y, contentW, 18, "F", 2);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.2);
  roundedRect(doc, PAGE.marginX, y, contentW, 18, "S", 2);

  caps(doc, "Planta arquitectónica", left, y + 6, { color: ACCENT });
  text(doc, `${s.unidad} · ${s.modelo}`, left, y + 12, { size: 11, bold: true });
  text(
    doc,
    `Edificio ${s.edificio} · ${s.lado}${s.entregaLabel ? ` · Entrega ${s.entregaLabel}` : ""}`,
    PAGE.marginX + contentW - 4,
    y + 12,
    { size: 7.5, color: MUTED, align: "right", maxW: contentW * 0.45 },
  );
  y += 24;

  const usableH = pageH - y - PAGE.marginBottom - 8;
  const hasRoof = Boolean(roof);

  if (!planta && !roof) {
    setFill(doc, SLATE_50);
    roundedRect(doc, PAGE.marginX, y, contentW, 40, "F", 2);
    text(doc, "Planta no disponible para esta unidad.", left, y + 20, {
      size: 9,
      color: MUTED,
    });
    return;
  }

  if (hasRoof && planta && roof) {
    const gap = 4;
    const colW = (contentW - gap) / 2;
    const boxH = Math.min(usableH - 10, 150);

    caps(doc, "Planta", left, y, { color: ACCENT, size: 5.5 });
    caps(doc, "Roof garden", left + colW + gap, y, { color: ACCENT, size: 5.5 });
    y += 3;

    setFill(doc, WHITE);
    setDraw(doc, BORDER);
    roundedRect(doc, PAGE.marginX, y, colW, boxH, "FD", 2);
    roundedRect(doc, PAGE.marginX + colW + gap, y, colW, boxH, "FD", 2);

    try {
      drawFittedImage(doc, planta, PAGE.marginX, y, colW, boxH, 4);
    } catch {
      // opcional
    }
    try {
      drawFittedImage(doc, roof, PAGE.marginX + colW + gap, y, colW, boxH, 4);
    } catch {
      // opcional
    }
  } else if (planta) {
    const boxH = Math.min(usableH, 170);
    caps(doc, "Planta", left, y, { color: ACCENT, size: 5.5 });
    y += 3;
    setFill(doc, WHITE);
    setDraw(doc, BORDER);
    roundedRect(doc, PAGE.marginX, y, contentW, boxH, "FD", 2);
    try {
      drawFittedImage(doc, planta, PAGE.marginX, y, contentW, boxH, 5);
    } catch {
      // opcional
    }
  }
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
  const left = PAGE.marginX + 4;
  const footerTop = pageH - PAGE.marginBottom - PAGE.footerH;

  const fechaDoc = new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let y: number = PAGE.marginTop;
  y = drawHeader(doc, y, contentW, input, logo, fechaDoc);

  setFill(doc, SLATE_50);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.2);
  roundedRect(doc, PAGE.marginX, y, contentW, 34, "FD", 2);
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
  roundedRect(doc, PAGE.marginX, y, contentW * 0.42, 20, "F", 2);
  caps(doc, "Precio lista mar26", left, y + 6, { color: WHITE, size: 5.5 });
  text(doc, formatPrice(s.precioLista), left, y + 14, {
    size: 12,
    bold: true,
    color: WHITE,
  });

  setFill(doc, INK);
  roundedRect(
    doc,
    PAGE.marginX + contentW * 0.42 + PAGE.gap,
    y,
    contentW * 0.58 - PAGE.gap,
    20,
    "F",
    2,
  );
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
  paymentRows.push(["Descuento vs lista", formatPctShort(s.descuentoVsListaPct)]);
  if (s.descuentoEspecialPct && s.descuentoEspecialPct > 0) {
    paymentRows.push([
      "Descuento especial",
      formatPctShort(s.descuentoEspecialPct),
    ]);
  }

  setFill(doc, WHITE);
  setDraw(doc, BORDER);
  const payH = 8 + paymentRows.length * 8;
  roundedRect(doc, PAGE.marginX, y, contentW, payH, "FD", 2);
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
  roundedRect(doc, PAGE.marginX, y, contentW, 16, "F", 2);
  caps(doc, "Plusvalía / renta referencial", left, y + 5);
  text(
    doc,
    `Renta estimada ${formatPrice(s.rentaMensual)}/mes · rendimiento rentas ~${formatPctShort(s.rendimientoRentasAnual)} anual`,
    left,
    y + 11,
    { size: 8, maxW: contentW - 8 },
  );

  if (planta || roof) {
    y += 20;
    setFill(doc, CREAM);
    setDraw(doc, BORDER);
    roundedRect(doc, PAGE.marginX, y, contentW, 12, "FD", 2);
    text(
      doc,
      roof
        ? "Ver página siguiente: planta arquitectónica y roof garden."
        : "Ver página siguiente: planta arquitectónica.",
      left,
      y + 7.5,
      { size: 8, color: INK, maxW: contentW - 8 },
    );
  }

  setFill(doc, SLATE_50);
  roundedRect(doc, PAGE.marginX, footerTop, contentW, PAGE.footerH, "F", 2);
  DISCLAIMERS.forEach((line, index) => {
    text(doc, `• ${line}`, left, footerTop + 5 + index * 4.5, {
      size: 6,
      color: MUTED,
      maxW: contentW - 8,
    });
  });

  if (planta || roof) {
    drawPlantasPage(doc, input, planta, roof);
  }

  const fileName = `cotizacion-gavia-${s.unidad}-${slugify(input.clienteNombre ?? "prospecto")}.pdf`;
  doc.save(fileName);
}
