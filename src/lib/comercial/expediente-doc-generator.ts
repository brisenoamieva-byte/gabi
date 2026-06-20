import { readFileSync } from "node:fs";
import { join } from "node:path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { CotizacionRecord, OperacionComercialRecord, ProspectoRecord } from "@/lib/comercial/sembrado-status";
import { formatPrice } from "@/lib/format/money";

export type ExpedienteDocContext = Record<string, string>;

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const expedienteDocxMime = DOCX_MIME;

const formatDateLong = (value: string | null | undefined): string => {
  if (!value) {
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date());
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(parsed);
};

const money = (value: number | null | undefined): string =>
  value != null && Number.isFinite(value) ? formatPrice(value) : "";

export const buildExpedienteDocContext = (input: {
  operacion: OperacionComercialRecord;
  unidadNumero: string;
  desarrolloNombre: string;
  prospecto?: ProspectoRecord | null;
  cotizacion?: CotizacionRecord | null;
}): ExpedienteDocContext => {
  const { operacion, unidadNumero, desarrolloNombre, prospecto, cotizacion } = input;
  const precioLista = operacion.precio_lista ?? cotizacion?.precio_lista ?? null;
  const precioVenta = operacion.precio_venta ?? cotizacion?.precio_total ?? null;
  const esquema = operacion.esquema_pago ?? cotizacion?.esquema_pago ?? "";
  const cliente = operacion.cliente_nombre?.trim() || prospecto?.nombre?.trim() || "";
  const fechaHoy = formatDateLong(null);

  const ctx: ExpedienteDocContext = {
    cliente_nombre: cliente,
    CLIENTE_NOMBRE: cliente,
    unidad_numero: unidadNumero,
    UNIDAD: unidadNumero,
    desarrollo_nombre: desarrolloNombre,
    DESARROLLO: desarrolloNombre,
    precio_lista: money(precioLista),
    PRECIO_LISTA: money(precioLista),
    precio_venta: money(precioVenta),
    PRECIO_VENTA: money(precioVenta),
    esquema_pago: esquema,
    ESQUEMA_PAGO: esquema,
    fecha_hoy: fechaHoy,
    FECHA_HOY: fechaHoy,
    fecha_apartado: formatDateLong(operacion.fecha_apartado),
    promotor_nombre: operacion.promotor_nombre ?? prospecto?.promotor_nombre ?? "",
    equipo_venta: operacion.equipo_venta ?? prospecto?.equipo_venta ?? "",
    email: prospecto?.email ?? "",
    telefono: prospecto?.telefono ?? "",
    tipo_inversion: operacion.tipo_inversion ?? prospecto?.tipo_inversion ?? "",
    medio_publicitario: operacion.medio_publicitario ?? prospecto?.medio_publicitario ?? "",
    observaciones: operacion.observaciones ?? prospecto?.notas ?? "",
  };

  return ctx;
};

export const renderExpedienteDocx = (templatePath: string, context: ExpedienteDocContext): Buffer => {
  const content = readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });

  doc.render(context);

  return Buffer.from(doc.getZip().generate({ type: "nodebuffer" }));
};

export const resolveExpedienteTemplatePath = (
  desarrolloSlug: string,
  fileName: string,
): string => join(process.cwd(), "public", "documentos-templates", desarrolloSlug, fileName);
