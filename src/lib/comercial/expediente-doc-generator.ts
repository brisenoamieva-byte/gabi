import { readFileSync } from "node:fs";
import { join } from "node:path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { DatosBancarios } from "@/lib/data";
import { getDatosBancarios } from "@/lib/data";
import type {
  CotizacionRecord,
  OperacionComercialRecord,
  ProspectoRecord,
} from "@/lib/comercial/sembrado-status";
import {
  normalizeClienteKyc,
  normalizePlanPago,
  type ClienteKycDatos,
  type PlanPagoDatos,
  type PlanPagoTramo,
} from "@/lib/comercial/expediente-oferta-types";
import { formatPrice } from "@/lib/format/money";
import { moneyToSpanishWords } from "@/lib/format/number-to-spanish-words";
import { decodeMisionLaGaviaUnidad } from "@/lib/disponibilidad/planos/mision-la-gavia";
import { MISION_LA_GAVIA_DESARROLLO_ID } from "@/lib/catalog/mision-la-gavia";

export type ExpedienteDocContext = Record<string, string>;

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const expedienteDocxMime = DOCX_MIME;

const GAVIA_CUOTA_MANTENIMIENTO_DEFAULT = 1800;
const GAVIA_APARTADO_DEFAULT = 50_000;

const NIVEL_LABEL: Record<1 | 2 | 3, string> = {
  1: "planta baja",
  2: "primer nivel",
  3: "segundo nivel",
};

const formatDateLong = (value: string | null | undefined): string => {
  if (!value) {
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date());
  }
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(parsed);
};

const money = (value: number | null | undefined): string =>
  value != null && Number.isFinite(value) ? formatPrice(value) : "";

const moneyWithWords = (value: number | null | undefined): { num: string; letra: string } => ({
  num: money(value),
  letra: moneyToSpanishWords(value),
});

/** Extrae etiqueta de modelo desde prototipoId o tipo (ej. 3R). */
export const resolveModeloLabel = (
  prototipoId: string | null | undefined,
  tipo: string | null | undefined,
): string => {
  const fromProto = prototipoId?.trim();
  if (fromProto) {
    const parts = fromProto.split("-");
    const last = parts[parts.length - 1]?.trim();
    if (last) {
      return last.toUpperCase();
    }
  }
  const fromTipo = tipo?.trim();
  if (fromTipo) {
    const match = fromTipo.match(/\b(\d+[A-Za-z]?R?)\b/i) ?? fromTipo.match(/\b([A-Za-z]*\d+[A-Za-z]*)\b/);
    if (match) {
      return match[1].toUpperCase();
    }
    return fromTipo;
  }
  return "";
};

export const resolvePlantaLabel = (
  unidadNumero: string,
  desarrolloId: string,
  override?: string | null,
): string => {
  if (override?.trim()) {
    return override.trim();
  }
  if (desarrolloId === MISION_LA_GAVIA_DESARROLLO_ID) {
    const decoded = decodeMisionLaGaviaUnidad(unidadNumero);
    if (decoded) {
      return NIVEL_LABEL[decoded.nivel];
    }
    // Códigos tipo N-201: dígito de centenas ~ nivel
    const match = /^[A-Za-z]-?(\d)$/.exec(unidadNumero.trim())
      ?? /^[A-Za-z]\s*[-–]?\s*(\d)\d{2}$/.exec(unidadNumero.trim());
    if (match) {
      const nivel = Number(match[1]) as 1 | 2 | 3;
      if (nivel === 1 || nivel === 2 || nivel === 3) {
        return NIVEL_LABEL[nivel];
      }
    }
  }
  return "";
};

const ordinalTramo = (index: number): string => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  return `${letters[index] ?? String(index + 1)}).-`;
};

const formatTramoParagraph = (tramo: PlanPagoTramo, index: number): string => {
  const total = moneyWithWords(tramo.monto_total);
  const mensual = moneyWithWords(tramo.monto_mensual);
  const dia = tramo.dia_pago && tramo.dia_pago > 0 ? tramo.dia_pago : 30;
  const pagosLabel =
    tramo.num_pagos === 1
      ? "1 pago"
      : `${tramo.num_pagos} pagos mensuales`;
  return `${ordinalTramo(index)} La cantidad de ${total.num} (${total.letra}) en ${pagosLabel} de ${mensual.num} (${mensual.letra}) que será cubiertos los días ${dia} de cada mes, de ${tramo.periodo_texto}.`;
};

export const buildPlanPagoCuerpo = (
  plan: PlanPagoDatos,
  precioVenta: number | null,
): {
  plan_pago_apartado: string;
  plan_pago_saldo: string;
  plan_pago_tramos: string;
  plan_pago_finiquito: string;
  plan_pago_cuerpo: string;
  saldo: number | null;
} => {
  if (plan.texto_libre?.trim()) {
    return {
      plan_pago_apartado: "",
      plan_pago_saldo: "",
      plan_pago_tramos: plan.texto_libre.trim(),
      plan_pago_finiquito: "",
      plan_pago_cuerpo: plan.texto_libre.trim(),
      saldo: null,
    };
  }

  const apartado = plan.apartado_monto ?? null;
  const apartadoWords = moneyWithWords(apartado);
  const apartadoFecha = plan.apartado_fecha?.trim() || "";
  const plan_pago_apartado =
    apartado != null
      ? `Pagos anticipados por la suma de ${apartadoWords.num} (${apartadoWords.letra})${
          apartadoFecha ? `, que fueron cubiertos el ${apartadoFecha}` : ""
        }.`
      : "";

  const tramosSum = (plan.tramos ?? []).reduce((acc, t) => acc + (t.monto_total || 0), 0);
  const finiquito = plan.finiquito_monto ?? null;
  let saldo: number | null = null;
  if (precioVenta != null && apartado != null) {
    saldo = Math.round((precioVenta - apartado) * 100) / 100;
  } else if (apartado != null && (tramosSum || finiquito)) {
    saldo = Math.round((tramosSum + (finiquito ?? 0)) * 100) / 100;
  }

  const saldoWords = moneyWithWords(saldo);
  const plan_pago_saldo =
    saldo != null
      ? `El saldo del precio, es decir, la cantidad de ${saldoWords.num} (${saldoWords.letra}), de la siguiente manera:`
      : "";

  const tramosText = (plan.tramos ?? [])
    .filter((t) => t.monto_total > 0)
    .map((t, i) => formatTramoParagraph(t, i))
    .join("\n");

  let plan_pago_finiquito = "";
  if (finiquito != null && finiquito > 0) {
    const fw = moneyWithWords(finiquito);
    const idx = (plan.tramos ?? []).filter((t) => t.monto_total > 0).length;
    const fecha = plan.finiquito_fecha?.trim() || "entrega del departamento";
    const fuente = plan.finiquito_fuente?.trim() || "recursos propios y/o crédito hipotecario";
    plan_pago_finiquito = `${ordinalTramo(idx)} Un pago de ${fw.num} (${fw.letra}) que será cubierto en ${fecha}, con ${fuente}.`;
  }

  const plan_pago_tramos = [tramosText, plan_pago_finiquito].filter(Boolean).join("\n");
  const plan_pago_cuerpo = [plan_pago_apartado, plan_pago_saldo, plan_pago_tramos]
    .filter(Boolean)
    .join("\n");

  return {
    plan_pago_apartado,
    plan_pago_saldo,
    plan_pago_tramos,
    plan_pago_finiquito,
    plan_pago_cuerpo,
    saldo,
  };
};

export type ExpedienteUnidadMeta = {
  unidadNumero: string;
  tipo?: string | null;
  prototipoId?: string | null;
  plantaOverride?: string | null;
};

export const buildExpedienteDocContext = (input: {
  operacion: OperacionComercialRecord;
  unidad: ExpedienteUnidadMeta;
  desarrolloNombre: string;
  prospecto?: ProspectoRecord | null;
  cotizacion?: CotizacionRecord | null;
  datosBancarios?: DatosBancarios | null;
  cuotaMantenimiento?: number | null;
  apartadoDefault?: number | null;
}): ExpedienteDocContext => {
  const {
    operacion,
    unidad,
    desarrolloNombre,
    prospecto,
    cotizacion,
    cuotaMantenimiento,
    apartadoDefault,
  } = input;

  const kyc = normalizeClienteKyc(operacion.cliente_kyc);
  const plan = normalizePlanPago(operacion.plan_pago);

  const precioLista = operacion.precio_lista ?? cotizacion?.precio_lista ?? null;
  const precioVenta = operacion.precio_venta ?? cotizacion?.precio_total ?? null;
  const esquema = operacion.esquema_pago ?? cotizacion?.esquema_pago ?? "";
  const cliente = operacion.cliente_nombre?.trim() || prospecto?.nombre?.trim() || "";
  const fechaHoy = formatDateLong(null);
  const fechaApartado = formatDateLong(operacion.fecha_apartado);

  const modelo = resolveModeloLabel(unidad.prototipoId, unidad.tipo);
  const planta = resolvePlantaLabel(
    unidad.unidadNumero,
    operacion.desarrollo_id,
    unidad.plantaOverride,
  );
  const modeloPlanta = [modelo ? `modelo ${modelo}` : "", planta].filter(Boolean).join(" ").trim();
  const ubicacionUnidad = [
    `Depto ${unidad.unidadNumero}`,
    planta ? planta.replace(/^./, (c) => c.toUpperCase()) : "",
  ]
    .filter(Boolean)
    .join(" ");

  const garantia =
    plan.apartado_monto ??
    apartadoDefault ??
    (operacion.desarrollo_id === MISION_LA_GAVIA_DESARROLLO_ID ? GAVIA_APARTADO_DEFAULT : null);

  const cuota =
    cuotaMantenimiento ??
    (operacion.desarrollo_id === MISION_LA_GAVIA_DESARROLLO_ID
      ? GAVIA_CUOTA_MANTENIMIENTO_DEFAULT
      : null);

  const precioW = moneyWithWords(precioVenta);
  const listaW = moneyWithWords(precioLista);
  const garantiaW = moneyWithWords(garantia);
  const cuotaW = moneyWithWords(cuota);
  const planBlocks = buildPlanPagoCuerpo(
    {
      ...plan,
      apartado_monto: plan.apartado_monto ?? garantia,
      apartado_fecha: plan.apartado_fecha || fechaApartado,
    },
    precioVenta,
  );
  const saldoW = moneyWithWords(planBlocks.saldo);

  const bancarios = input.datosBancarios ?? getDatosBancarios(operacion.desarrollo_id);

  const email = prospecto?.email ?? "";
  const telefono = prospecto?.telefono ?? "";
  const ocupacion = kyc.ocupacion || prospecto?.ocupacion || "";

  const consentSi = kyc.consentir_transferencia ? "X" : " ";
  const consentNo = kyc.consentir_transferencia ? " " : "X";

  const ctx: ExpedienteDocContext = {
    cliente_nombre: cliente,
    CLIENTE_NOMBRE: cliente,
    unidad_numero: unidad.unidadNumero,
    UNIDAD: unidad.unidadNumero,
    modelo,
    planta,
    modelo_planta: modeloPlanta,
    ubicacion_unidad: ubicacionUnidad,
    desarrollo_nombre: desarrolloNombre,
    DESARROLLO: desarrolloNombre,
    precio_lista: listaW.num,
    PRECIO_LISTA: listaW.num,
    precio_lista_letra: listaW.letra,
    precio_venta: precioW.num,
    PRECIO_VENTA: precioW.num,
    precio_venta_letra: precioW.letra,
    monto_operacion: precioW.num,
    monto_operacion_letra: precioW.letra,
    garantia: garantiaW.num,
    garantia_letra: garantiaW.letra,
    apartado: garantiaW.num,
    apartado_letra: garantiaW.letra,
    saldo: saldoW.num,
    saldo_letra: saldoW.letra,
    cuota_mantenimiento: cuotaW.num,
    cuota_mantenimiento_letra: cuotaW.letra,
    esquema_pago: esquema,
    ESQUEMA_PAGO: esquema,
    fecha_hoy: fechaHoy,
    FECHA_HOY: fechaHoy,
    fecha_apartado: fechaApartado,
    promotor_nombre: operacion.promotor_nombre ?? prospecto?.promotor_nombre ?? "",
    equipo_venta: operacion.equipo_venta ?? prospecto?.equipo_venta ?? "",
    email,
    telefono,
    tipo_inversion: operacion.tipo_inversion ?? prospecto?.tipo_inversion ?? "",
    medio_publicitario: operacion.medio_publicitario ?? prospecto?.medio_publicitario ?? "",
    observaciones: operacion.observaciones ?? prospecto?.notas ?? "",

    identificacion_tipo: kyc.identificacion_tipo ?? "INE",
    identificacion_numero: kyc.identificacion_numero ?? "",
    fecha_nacimiento: kyc.fecha_nacimiento ?? "",
    lugar_nacimiento: kyc.lugar_nacimiento ?? "",
    nacionalidad: kyc.nacionalidad ?? "",
    estado_civil: kyc.estado_civil ?? "",
    curp: kyc.curp ?? "",
    rfc: kyc.rfc ?? "",
    domicilio: kyc.domicilio ?? "",
    ocupacion,
    tipo_operacion: kyc.tipo_operacion ?? "Libre Especial",

    banco_titular: bancarios.razonSocial,
    banco_nombre: bancarios.banco,
    banco_cuenta: bancarios.cuenta,
    banco_clabe: bancarios.clabe,
    banco_rfc: bancarios.rfc,

    plan_pago_apartado: planBlocks.plan_pago_apartado,
    plan_pago_saldo: planBlocks.plan_pago_saldo,
    plan_pago_tramos: planBlocks.plan_pago_tramos,
    plan_pago_finiquito: planBlocks.plan_pago_finiquito,
    plan_pago_cuerpo: planBlocks.plan_pago_cuerpo,

    consentimiento_si: consentSi,
    consentimiento_no: consentNo,
  };

  return ctx;
};

export const mergeKycPrefill = (
  existing: ClienteKycDatos | null | undefined,
  prospecto?: ProspectoRecord | null,
): ClienteKycDatos => {
  const base = normalizeClienteKyc(existing);
  return {
    ...base,
    ocupacion: base.ocupacion || prospecto?.ocupacion || "",
  };
};

export const renderExpedienteDocxFromBuffer = (
  buffer: Buffer,
  context: ExpedienteDocContext,
): Buffer => {
  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(context);
  return Buffer.from(doc.getZip().generate({ type: "nodebuffer" }));
};

export const renderExpedienteDocx = (templatePath: string, context: ExpedienteDocContext): Buffer => {
  const content = readFileSync(templatePath);
  return renderExpedienteDocxFromBuffer(Buffer.from(content), context);
};

export const resolveExpedienteTemplatePath = (
  desarrolloSlug: string,
  fileName: string,
): string => join(process.cwd(), "public", "documentos-templates", desarrolloSlug, fileName);

/** Placeholders clave que deberían existir en plantillas del pack. */
export const EXPEDIENTE_TEMPLATE_REQUIRED_TAGS = [
  "cliente_nombre",
  "unidad_numero",
  "fecha_hoy",
] as const;

export const findMissingTemplateTags = (
  templateBuffer: Buffer,
  required: readonly string[] = EXPEDIENTE_TEMPLATE_REQUIRED_TAGS,
): string[] => {
  const zip = new PizZip(templateBuffer);
  const entry = zip.file("word/document.xml");
  if (!entry) {
    return [...required];
  }
  const xml = entry.asText();
  return required.filter((tag) => !xml.includes(`{${tag}}`));
};
