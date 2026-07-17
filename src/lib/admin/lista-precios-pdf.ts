import { formatPrice } from "@/lib/format/money";
import {
  descuentoFracToPctPoints,
  descuentosParaPdf,
  precioConDescuentoEsquema,
  type ListaPrecioEsquemaDescuento,
} from "@/lib/admin/lista-precios-descuentos";
import type { ListaPreciosDetail } from "@/lib/admin/listas-precios-types";
import type { InventarioEstatus } from "@/lib/comercial/sembrado-status";
import { isUnidadEnEtapaVendible } from "@/lib/inventario/sembrado-cotizable";

const INK: [number, number, number] = [32, 16, 68];
const MUTED: [number, number, number] = [100, 116, 139];
const BORDER: [number, number, number] = [226, 232, 240];
const SLATE_50: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];
const ACCENT: [number, number, number] = [108, 194, 74];

type JsPDFDoc = import("jspdf").jsPDF;

export type ListaPreciosPdfOptions = {
  desarrolloNombre: string;
  lista: ListaPreciosDetail;
  /** Si true, omite unidades no disponibles. Default true. */
  soloDisponibles?: boolean;
  /**
   * Si true (default), en desarrollos con etapa comercial abierta
   * (ej. Gavia etapa 1 / edificios cotizables) omite el resto.
   */
  soloEtapaVendible?: boolean;
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48) || "lista";

const formatPctHeader = (descuentoPct: number) => {
  const points = descuentoFracToPctPoints(descuentoPct);
  if (points <= 0) {
    return "0%";
  }
  return `−${points.toLocaleString("es-MX", { maximumFractionDigits: 2 })}%`;
};

const ESTATUS_PDF_LABEL: Record<InventarioEstatus, string> = {
  disponible: "Disponible",
  apartado: "Apartado",
  vendido: "Vendido",
  bloqueado: "Bloqueado",
};

const normalizeEstatusInventario = (
  estatus: string | null | undefined,
): InventarioEstatus | null => {
  const value = (estatus ?? "").trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (
    value === "disponible" ||
    value === "apartado" ||
    value === "vendido" ||
    value === "bloqueado"
  ) {
    return value;
  }
  if (value === "cancelado") {
    return "bloqueado";
  }
  return null;
};

const formatEstatusPdf = (estatus: string | null | undefined): string => {
  const normalized = normalizeEstatusInventario(estatus);
  if (!normalized) {
    return estatus?.trim() ? estatus.trim() : "Disponible";
  }
  return ESTATUS_PDF_LABEL[normalized];
};

/** Solo inventario libre para venta (alineado a sembrado / cotizador). */
const isDisponible = (estatus: string | null | undefined) => {
  const normalized = normalizeEstatusInventario(estatus);
  return normalized == null || normalized === "disponible";
};

export async function downloadListaPreciosPdf(
  options: ListaPreciosPdfOptions,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "letter",
  }) as JsPDFDoc;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const marginTop = 12;
  const marginBottom = 12;
  const contentW = pageW - marginX * 2;

  const soloDisponibles = options.soloDisponibles !== false;
  const soloEtapaVendible = options.soloEtapaVendible !== false;
  const desarrolloId = options.lista.desarrollo_id;

  const esquemas = descuentosParaPdf(options.lista.descuentos_esquema);
  const unidades = options.lista.unidades
    .filter((row) => (soloDisponibles ? isDisponible(row.estatusInventario) : true))
    .filter((row) =>
      soloEtapaVendible
        ? isUnidadEnEtapaVendible(desarrolloId, row.unidad ?? "")
        : true,
    )
    .slice()
    .sort((a, b) => (a.unidad ?? "").localeCompare(b.unidad ?? "", "es"));

  const colUnidad = 20;
  const colTipo = 24;
  const colEstatus = 22;
  const colLista = 26;
  const esquemaCols = Math.max(esquemas.length, 1);
  const remaining = contentW - colUnidad - colTipo - colEstatus - colLista;
  const colEsquema = remaining / esquemaCols;

  let y = marginTop;

  const drawHeader = () => {
    doc.setFillColor(...INK);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Lista de precios", marginX, 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(options.desarrolloNombre, marginX, 15);
    doc.setFontSize(8);
    const filtroNota = [
      soloDisponibles ? "solo disponibles" : null,
      soloEtapaVendible ? "etapa comercial abierta" : null,
    ]
      .filter(Boolean)
      .join(" · ");
    doc.text(
      `${options.lista.nombre} · vigencia ${options.lista.vigencia_desde}${
        options.lista.vigencia_hasta ? ` → ${options.lista.vigencia_hasta}` : ""
      }${filtroNota ? ` · ${filtroNota}` : ""}`,
      marginX,
      20,
    );
    doc.setFillColor(...ACCENT);
    doc.rect(pageW - marginX - 28, 7, 28, 8, "F");
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("BBR · Gabi", pageW - marginX - 14, 12.2, { align: "center" });
    y = 28;
  };

  const drawTableHeader = () => {
    doc.setFillColor(...SLATE_50);
    doc.rect(marginX, y, contentW, 10, "F");
    doc.setDrawColor(...BORDER);
    doc.rect(marginX, y, contentW, 10);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    let x = marginX + 1.5;
    doc.text("Unidad", x, y + 6.2);
    x += colUnidad;
    doc.text("Tipo", x, y + 6.2);
    x += colTipo;
    doc.text("Estatus", x, y + 6.2);
    x += colEstatus;
    doc.text("Precio lista", x + colLista - 1.5, y + 6.2, { align: "right" });
    x += colLista;
    for (const esquema of esquemas) {
      const label = `${esquema.label} (${formatPctHeader(esquema.descuentoPct)})`;
      doc.text(label, x + colEsquema - 1.5, y + 6.2, { align: "right" });
      x += colEsquema;
    }
    y += 10;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageH - marginBottom) {
      return;
    }
    doc.addPage();
    drawHeader();
    drawTableHeader();
  };

  drawHeader();

  if (!unidades.length) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.text(
      soloDisponibles || soloEtapaVendible
        ? "No hay unidades disponibles en la etapa comercial abierta para esta lista."
        : "No hay unidades para esta lista.",
      marginX,
      y + 8,
    );
  } else if (!esquemas.length) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.text(
      "Configura los descuentos por esquema en la lista antes de exportar el PDF.",
      marginX,
      y + 8,
    );
  } else {
    drawTableHeader();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    for (let index = 0; index < unidades.length; index += 1) {
      const row = unidades[index];
      ensureSpace(7);
      if (index % 2 === 1) {
        doc.setFillColor(252, 252, 253);
        doc.rect(marginX, y, contentW, 7, "F");
      }
      doc.setDrawColor(...BORDER);
      doc.line(marginX, y + 7, marginX + contentW, y + 7);

      let x = marginX + 1.5;
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.text(row.unidad ?? "—", x, y + 4.8);
      x += colUnidad;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text((row.tipo ?? "—").slice(0, 18), x, y + 4.8);
      x += colTipo;
      doc.setTextColor(...INK);
      doc.text(formatEstatusPdf(row.estatusInventario), x, y + 4.8);
      x += colEstatus;
      doc.text(formatPrice(row.precio_lista), x + colLista - 1.5, y + 4.8, {
        align: "right",
      });
      x += colLista;

      for (const esquema of esquemas) {
        const precio = precioConDescuentoEsquema(row.precio_lista, esquema.descuentoPct);
        doc.text(formatPrice(precio), x + colEsquema - 1.5, y + 4.8, {
          align: "right",
        });
        x += colEsquema;
      }
      y += 7;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(
      "Precios referenciales con descuentos por esquema. Solo etapa comercial abierta y unidades disponibles. Sujeto a cambio sin previo aviso.",
      marginX,
      pageH - 6,
    );
    doc.text(`Pág. ${page}/${pageCount}`, pageW - marginX, pageH - 6, {
      align: "right",
    });
  }

  const filename = `lista-precios-${slugify(options.desarrolloNombre)}-${slugify(options.lista.codigo)}.pdf`;
  doc.save(filename);
}

export type { ListaPrecioEsquemaDescuento };
