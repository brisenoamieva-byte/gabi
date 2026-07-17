/**
 * Simulador Misión La Gavia — departamentos.
 * Réplica la hoja «Descuentos» + precios mar26 del Excel oficial.
 *
 * Base por esquema:
 * - Contado / MSI: precios de lista mar26 o PMT al 11% anual (hoja Descuentos).
 * - 30-70 / 15-85: columnas precalculadas del Excel (incluyen capitalización a entrega).
 */

import {
  addMonths,
  endOfMonth,
  formatMonthYear,
  fv,
  monthsBetween,
  pmt,
  startOfMonth,
} from "@/lib/cotizador/pasaje-simulador";
import {
  clampDescuentoEspecialPct,
  factorDescuentoEspecial,
} from "@/lib/comercial/descuento-especial";
import { roundMoney, formatPrice } from "@/lib/format/money";
import { isMisionLaGaviaDesarrollo } from "@/lib/catalog/mision-la-gavia";
import {
  MISION_LA_GAVIA_SIMULADOR_CONFIG,
} from "@/lib/corredor/mision-la-gavia-simulador-config.generated";
import { MISION_LA_GAVIA_UNIDADES } from "@/lib/corredor/mision-la-gavia-unidades.generated";
import type {
  MisionLaGaviaEsquemaConfig,
  MisionLaGaviaEsquemaId,
  MisionLaGaviaLibreConfig,
  MisionLaGaviaSimulacionInput,
  MisionLaGaviaSimulacionResult,
  MisionLaGaviaUnidadRecord,
} from "@/lib/corredor/mision-la-gavia-simulador-data-types";
import type { DisponibilidadUnidad } from "@/lib/data";

export type {
  MisionLaGaviaEsquemaConfig,
  MisionLaGaviaEsquemaId,
  MisionLaGaviaLibreConfig,
  MisionLaGaviaSimulacionInput,
  MisionLaGaviaSimulacionResult,
  MisionLaGaviaUnidadRecord,
} from "@/lib/corredor/mision-la-gavia-simulador-data-types";

const round2 = roundMoney;
const COEF_RENTA = 0.0055;

/**
 * Entrega comercial oficial etapa 1 (dic 2027).
 * Las unidades generadas del Excel traen `entregaIso: null` y el workbook
 * solo aporta `mesesEntregaDefault: 24` (meses desde la cotización), lo cual
 * desplaza la fecha según el día de la cotización. Usamos la fecha fija.
 */
export const MISION_LA_GAVIA_ENTREGA_ETAPA1_ISO = "2027-12-01";

/** Esquemas fijos del Excel (sin Libre editable). */
export const MISION_LA_GAVIA_ESQUEMAS_FIJOS: MisionLaGaviaEsquemaId[] = [
  "contado",
  "6msi",
  "12msi",
  "30-70",
  "15-85",
];

export const MISION_LA_GAVIA_ESQUEMAS: MisionLaGaviaEsquemaId[] = [
  ...MISION_LA_GAVIA_ESQUEMAS_FIJOS,
  "libre",
];

/** Defaults Libre — misma lógica comercial que Pasaje, tasa Gavia 11%. */
export const MISION_LA_GAVIA_LIBRE_DEFAULTS = {
  enganchePct: 0.2,
  mensualidadesPct: 0.15,
} as const;

const LIBRE_ESQUEMA_CONFIG: MisionLaGaviaEsquemaConfig = {
  id: "libre",
  label: "Libre",
  descuentoPct: 0,
  enganchePct: MISION_LA_GAVIA_LIBRE_DEFAULTS.enganchePct,
  meses: "varia",
  finiquitoPct: 1 - MISION_LA_GAVIA_LIBRE_DEFAULTS.enganchePct - MISION_LA_GAVIA_LIBRE_DEFAULTS.mensualidadesPct,
};

export function isMisionLaGaviaSimuladorDesarrollo(
  desarrolloId: string | null | undefined,
): boolean {
  return isMisionLaGaviaDesarrollo(desarrolloId);
}

export function getMisionLaGaviaEsquemas(): MisionLaGaviaEsquemaConfig[] {
  const fromExcel = MISION_LA_GAVIA_SIMULADOR_CONFIG.esquemasPago.map((item) => ({
    id: item.id as MisionLaGaviaEsquemaId,
    label: item.label,
    descuentoPct: item.descuentoPct,
    enganchePct: item.enganchePct,
    meses: item.meses,
    finiquitoPct: item.finiquitoPct,
  }));
  return [...fromExcel, LIBRE_ESQUEMA_CONFIG];
}

export function getMisionLaGaviaEsquemaConfig(
  esquema: MisionLaGaviaEsquemaId,
): MisionLaGaviaEsquemaConfig | undefined {
  if (esquema === "libre") {
    return LIBRE_ESQUEMA_CONFIG;
  }
  return getMisionLaGaviaEsquemas().find((item) => item.id === esquema);
}

export function findMisionLaGaviaUnidadByCode(
  unidadCode: string,
): MisionLaGaviaUnidadRecord | undefined {
  return MISION_LA_GAVIA_UNIDADES.find((item) => item.unidad === unidadCode);
}

export function applyPrecioListaOverride(
  unidad: MisionLaGaviaUnidadRecord,
  precioListaOverride: number | null | undefined,
): MisionLaGaviaUnidadRecord {
  if (
    precioListaOverride == null ||
    !Number.isFinite(precioListaOverride) ||
    precioListaOverride <= 0 ||
    unidad.precioLista <= 0
  ) {
    return unidad;
  }
  if (Math.abs(precioListaOverride - unidad.precioLista) < 1) {
    return unidad;
  }

  const ratio = precioListaOverride / unidad.precioLista;
  const scale = (value: number | null) =>
    value == null ? null : round2(value * ratio);

  return {
    ...unidad,
    precioLista: round2(precioListaOverride),
    precioContado: round2(unidad.precioContado * ratio),
    precio303040: scale(unidad.precio303040),
    precio3070: scale(unidad.precio3070),
    precio1585: scale(unidad.precio1585),
  };
}

export function resolveMisionLaGaviaUnidadFromInventario(
  inventario: DisponibilidadUnidad[] | undefined,
  unidadId: string | undefined,
  unidadCode?: string,
): MisionLaGaviaUnidadRecord | undefined {
  let code = unidadCode;
  let inventarioPrecio: number | null | undefined;

  if (!code && unidadId && inventario?.length) {
    const row = inventario.find((item) => item.id === unidadId);
    code = row?.unidad;
    inventarioPrecio = row?.precio;
  } else if (unidadId && inventario?.length) {
    const row = inventario.find((item) => item.id === unidadId);
    inventarioPrecio = row?.precio;
  } else if (code && inventario?.length) {
    const row = inventario.find((item) => item.unidad === code);
    inventarioPrecio = row?.precio;
  }

  if (!code) {
    return undefined;
  }

  const base = findMisionLaGaviaUnidadByCode(code);
  if (!base) {
    return undefined;
  }

  return applyPrecioListaOverride(base, inventarioPrecio);
}

/** Escala todos los precios de la unidad por un factor (descuento especial). */
export function applyDescuentoEspecialUnidad(
  unidad: MisionLaGaviaUnidadRecord,
  descuentoEspecialPct: number,
): MisionLaGaviaUnidadRecord {
  const factor = factorDescuentoEspecial(descuentoEspecialPct);
  if (factor >= 1) {
    return unidad;
  }
  const scale = (value: number | null) =>
    value == null ? null : round2(value * factor);

  return {
    ...unidad,
    precioLista: round2(unidad.precioLista * factor),
    precioContado: round2(unidad.precioContado * factor),
    precio303040: scale(unidad.precio303040),
    precio3070: scale(unidad.precio3070),
    precio1585: scale(unidad.precio1585),
  };
}

function parseIsoDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return undefined;
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
}

function resolveFechaEntrega(
  unidad: MisionLaGaviaUnidadRecord,
  fechaCotizacion: Date,
): Date {
  const fromUnit = parseIsoDate(unidad.entregaIso);
  if (fromUnit) {
    return fromUnit;
  }

  const etapa1 = parseIsoDate(MISION_LA_GAVIA_ENTREGA_ETAPA1_ISO);
  if (etapa1) {
    return endOfMonth(etapa1, 0);
  }

  const meses = MISION_LA_GAVIA_SIMULADOR_CONFIG.mesesEntregaDefault;
  return endOfMonth(fechaCotizacion, meses);
}

function numPagosMsi(meses: number): number {
  return Math.max(1, meses - 1);
}

function precioBaseMsi(unidad: MisionLaGaviaUnidadRecord, descuentoPct: number): number {
  return round2(unidad.precioLista * (1 - descuentoPct));
}

function simularMsi(
  unidad: MisionLaGaviaUnidadRecord,
  cfg: MisionLaGaviaEsquemaConfig,
  fechaCotizacion: Date,
  tasaMensual: number,
): Pick<
  MisionLaGaviaSimulacionResult,
  | "precioTotal"
  | "enganche"
  | "enganchePct"
  | "mensualidad"
  | "numMensualidades"
  | "fechaPrimerPago"
  | "fechaUltimoPago"
  | "descripcionPago"
> {
  const meses = typeof cfg.meses === "number" ? cfg.meses : 6;
  const numPagos = numPagosMsi(meses);
  const precioBase = precioBaseMsi(unidad, cfg.descuentoPct);
  const enganche = round2(precioBase * cfg.enganchePct);
  const financiable = round2(precioBase * (1 - cfg.enganchePct));
  const mensualidad = round2(pmt(tasaMensual, numPagos, -financiable));
  const precioTotal = round2(enganche + mensualidad * numPagos);
  const fechaPrimerPago = endOfMonth(fechaCotizacion, 1);
  const fechaUltimoPago = addMonths(fechaPrimerPago, numPagos - 1);

  return {
    precioTotal,
    enganche,
    enganchePct: cfg.enganchePct,
    mensualidad,
    numMensualidades: numPagos,
    fechaPrimerPago,
    fechaUltimoPago,
    descripcionPago: `${cfg.label}: enganche ${Math.round(cfg.enganchePct * 100)}% + ${numPagos} pagos de ${formatMonthYear(fechaPrimerPago)} a ${formatMonthYear(fechaUltimoPago)}`,
  };
}

function simularPlazoFiniquito(
  unidad: MisionLaGaviaUnidadRecord,
  cfg: MisionLaGaviaEsquemaConfig,
  fechaEntrega: Date,
  precioTotal: number,
): Pick<
  MisionLaGaviaSimulacionResult,
  "enganche" | "enganchePct" | "finiquito" | "finiquitoPct" | "fechaFiniquito" | "descripcionPago"
> {
  const enganche = round2(precioTotal * cfg.enganchePct);
  const finiquito = round2(precioTotal - enganche);

  return {
    enganche,
    enganchePct: cfg.enganchePct,
    finiquito,
    finiquitoPct: cfg.finiquitoPct,
    fechaFiniquito: fechaEntrega,
    descripcionPago: `${cfg.label}: enganche ${Math.round(cfg.enganchePct * 100)}% + finiquito ${Math.round(cfg.finiquitoPct * 100)}% en ${formatMonthYear(fechaEntrega)}`,
  };
}

export function simularMisionLaGavia(
  input: MisionLaGaviaSimulacionInput,
): MisionLaGaviaSimulacionResult {
  const cfg = getMisionLaGaviaEsquemaConfig(input.esquema);
  const fechaCotizacion = input.fechaCotizacion ?? new Date();
  const tasaMensual = MISION_LA_GAVIA_SIMULADOR_CONFIG.tasaAnual / 12;
  const descuentoEspecialPct = clampDescuentoEspecialPct(
    input.descuentoEspecialPct ?? 0,
  );
  const unidadOriginal = input.unidad;
  const unidad = applyDescuentoEspecialUnidad(unidadOriginal, descuentoEspecialPct);
  const precioListaRef = unidadOriginal.precioLista;
  const fechaEntrega = resolveFechaEntrega(unidad, fechaCotizacion);
  const entregaLabel = formatMonthYear(fechaEntrega);
  const rentaMensual = round2(precioListaRef * COEF_RENTA);
  const rendimientoRentasAnual =
    precioListaRef > 0 ? (rentaMensual * 12) / precioListaRef : 0;

  const base: MisionLaGaviaSimulacionResult = {
    esquema: input.esquema,
    esquemaLabel: cfg?.label ?? input.esquema,
    unidad: unidad.unidad,
    modelo: unidad.modelo,
    edificio: unidad.edificio,
    lado: unidad.lado,
    m2Totales: unidad.m2Totales,
    precioLista: precioListaRef,
    precioTotal: 0,
    descuentoEspecialPct,
    descuentoVsListaPct: 0,
    enganche: 0,
    enganchePct: 0,
    entregaLabel,
    rentaMensual,
    rendimientoRentasAnual,
    descripcionPago: "",
  };

  if (!cfg) {
    return { ...base, error: "Esquema no configurado" };
  }

  if (precioListaRef <= 0) {
    return { ...base, error: "Precio lista no disponible" };
  }

  const esquema = input.esquema;
  const vsLista = (precioTotal: number) =>
    precioListaRef > 0 ? 1 - precioTotal / precioListaRef : 0;

  if (esquema === "contado") {
    const precioTotal = unidad.precioContado;
    const plazo = simularPlazoFiniquito(unidad, cfg, fechaEntrega, precioTotal);
    return {
      ...base,
      ...plazo,
      precioTotal,
      precioContado: unidad.precioContado,
      descuentoVsListaPct: vsLista(precioTotal),
      descripcionPago: `Contado: enganche ${Math.round(cfg.enganchePct * 100)}% + finiquito ${Math.round(cfg.finiquitoPct * 100)}% en ${entregaLabel}`,
    };
  }

  if (esquema === "6msi" || esquema === "12msi") {
    const msi = simularMsi(unidad, cfg, fechaCotizacion, tasaMensual);
    return {
      ...base,
      ...msi,
      descuentoVsListaPct: vsLista(msi.precioTotal),
    };
  }

  if (esquema === "30-70") {
    const precioTotal =
      unidad.precio3070 ?? round2(unidad.precioLista * (1 - cfg.descuentoPct));
    const plazo = simularPlazoFiniquito(unidad, cfg, fechaEntrega, precioTotal);
    return {
      ...base,
      ...plazo,
      precioTotal,
      descuentoVsListaPct: vsLista(precioTotal),
    };
  }

  if (esquema === "15-85") {
    const precioTotal =
      unidad.precio1585 ?? round2(unidad.precioLista * (1 - cfg.descuentoPct));
    const plazo = simularPlazoFiniquito(unidad, cfg, fechaEntrega, precioTotal);
    return {
      ...base,
      ...plazo,
      precioTotal,
      descuentoVsListaPct: vsLista(precioTotal),
    };
  }

  if (esquema === "libre") {
    return simularLibreMisionLaGavia({
      unidad,
      fechaCotizacion,
      fechaEntrega,
      tasaMensual,
      base,
      libre: input.libre,
      precioListaRef,
    });
  }

  return { ...base, error: "Esquema no soportado" };
}

function simularLibreMisionLaGavia(params: {
  unidad: MisionLaGaviaUnidadRecord;
  fechaCotizacion: Date;
  fechaEntrega: Date;
  tasaMensual: number;
  base: MisionLaGaviaSimulacionResult;
  libre?: MisionLaGaviaLibreConfig;
  precioListaRef: number;
}): MisionLaGaviaSimulacionResult {
  const {
    unidad,
    fechaCotizacion,
    fechaEntrega,
    tasaMensual,
    base,
    libre,
    precioListaRef,
  } = params;
  const precioContado = unidad.precioContado;
  const enganchePct = libre?.enganchePct ?? MISION_LA_GAVIA_LIBRE_DEFAULTS.enganchePct;
  const mensualidadesPct = Math.max(
    0,
    Math.min(
      libre?.mensualidadesPct ?? MISION_LA_GAVIA_LIBRE_DEFAULTS.mensualidadesPct,
      1 - enganchePct,
    ),
  );
  const fechaFiniquito = libre?.fechaFiniquito ?? fechaEntrega;
  const finiquitoPct = Math.max(0, 1 - enganchePct - mensualidadesPct);

  let error: string | undefined;
  if (precioContado <= 0) {
    error = "Precio contado no disponible.";
  } else if (enganchePct < 0.15) {
    error = "Enganche mínimo 15%.";
  } else if (enganchePct + mensualidadesPct < 0.3) {
    error = "Enganche + mensualidades deben sumar al menos 30%.";
  } else if (enganchePct + mensualidadesPct > 1 + 1e-9) {
    error = "Los porcentajes suman más de 100%.";
  }

  const firstPaymentDate = endOfMonth(fechaCotizacion, 1);
  const mesesHastaFiniquito = Math.max(
    1,
    monthsBetween(startOfMonth(fechaCotizacion), fechaFiniquito),
  );
  const numMensualidades =
    mensualidadesPct > 0 ? Math.max(1, mesesHastaFiniquito - 1) : 0;
  const fechaUltimoPago =
    numMensualidades > 0
      ? addMonths(firstPaymentDate, numMensualidades - 1)
      : undefined;

  const enganche = round2(precioContado * enganchePct);
  const mensualidadConInteres =
    numMensualidades > 0
      ? pmt(tasaMensual, numMensualidades, -(precioContado * mensualidadesPct))
      : 0;
  const finiquitoCapitalizado =
    finiquitoPct > 0
      ? fv(tasaMensual, mesesHastaFiniquito, 0, -(precioContado * finiquitoPct))
      : 0;
  const precioTotal = round2(
    enganche + mensualidadConInteres * numMensualidades + finiquitoCapitalizado,
  );

  const mensualidad = round2(
    numMensualidades > 0 ? (mensualidadesPct * precioTotal) / numMensualidades : 0,
  );
  const finiquito = round2(finiquitoPct * precioTotal);

  const partesPago = [
    `enganche ${formatPctShort(enganchePct)}`,
    numMensualidades > 0
      ? `${numMensualidades} mensualidades (${formatPctShort(mensualidadesPct)})`
      : null,
    finiquitoPct > 0
      ? `finiquito ${formatPctShort(finiquitoPct)} en ${formatMonthYear(fechaFiniquito)}`
      : null,
  ].filter(Boolean);

  return {
    ...base,
    esquemaLabel: "Libre",
    precioContado,
    precioTotal,
    descuentoVsListaPct:
      precioListaRef > 0 ? 1 - precioTotal / precioListaRef : 0,
    enganche,
    enganchePct,
    mensualidad,
    numMensualidades,
    fechaPrimerPago: numMensualidades > 0 ? firstPaymentDate : undefined,
    fechaUltimoPago,
    finiquito,
    finiquitoPct,
    fechaFiniquito,
    descripcionPago: `Libre: ${partesPago.join(" + ")} · capitalizado al ${(MISION_LA_GAVIA_SIMULADOR_CONFIG.tasaAnual * 100).toFixed(0)}% anual`,
    error,
  };
}

export function simularTodosEsquemasMisionLaGavia(
  unidad: MisionLaGaviaUnidadRecord,
  fechaCotizacion?: Date,
  descuentoEspecialPct?: number,
): MisionLaGaviaSimulacionResult[] {
  return MISION_LA_GAVIA_ESQUEMAS_FIJOS.map((esquema) =>
    simularMisionLaGavia({ unidad, esquema, fechaCotizacion, descuentoEspecialPct }),
  );
}

export function formatPctShort(value: number): string {
  return `${(value * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

export function buildMisionLaGaviaSimulacionSummary(
  result: MisionLaGaviaSimulacionResult,
  desarrolloNombre: string,
  clienteNombre?: string,
): string {
  const lines = [
    clienteNombre ? `Prospecto: ${clienteNombre}` : null,
    `${desarrolloNombre} · ${result.unidad} · ${result.modelo}`,
    `Edificio ${result.edificio} (${result.lado}) · ${result.m2Totales.toFixed(1)} m²`,
    "",
    `Precio lista: ${formatPrice(result.precioLista)}`,
    result.descuentoEspecialPct && result.descuentoEspecialPct > 0
      ? `Descuento especial: ${formatPctShort(result.descuentoEspecialPct)}`
      : null,
    `Esquema: ${result.esquemaLabel}`,
    `Total cliente: ${formatPrice(result.precioTotal)}`,
    `Descuento vs lista: ${formatPctShort(result.descuentoVsListaPct)}`,
    "",
    `Enganche (${formatPctShort(result.enganchePct)}): ${formatPrice(result.enganche)}`,
    result.numMensualidades && result.mensualidad
      ? `${result.numMensualidades} pagos de ${formatPrice(result.mensualidad)}`
      : null,
    result.fechaPrimerPago && result.fechaUltimoPago
      ? `  · de ${formatMonthYear(result.fechaPrimerPago)} a ${formatMonthYear(result.fechaUltimoPago)}`
      : null,
    result.finiquito && result.fechaFiniquito
      ? `Finiquito (${formatPctShort(result.finiquitoPct ?? 0)}): ${formatPrice(result.finiquito)} en ${formatMonthYear(result.fechaFiniquito)}`
      : null,
    result.entregaLabel ? `Entrega estimada: ${result.entregaLabel}` : null,
    "",
    "Ejercicio de rentas (referencial):",
    `  · Renta mensual: ${formatPrice(result.rentaMensual)}`,
    `  · Rendimiento anual estimado: ${formatPctShort(result.rendimientoRentasAnual)}`,
    "",
    "* Vigencia 10 días naturales, sujeto a cambio sin previo aviso (tarjetas de proceso).",
    "* Valores referenciales; no constituye preaprobación crediticia.",
  ].filter(Boolean);

  return lines.join("\n");
}

/** Meses hasta entrega (calendario comercial). */
export function mesesHastaEntregaMisionLaGavia(
  unidad: MisionLaGaviaUnidadRecord,
  fechaCotizacion = new Date(),
): number {
  const entrega = resolveFechaEntrega(unidad, fechaCotizacion);
  return monthsBetween(startOfMonth(fechaCotizacion), entrega);
}

/** Capitalización de finiquito (validación vs hoja Descuentos). */
export function capitalizarFiniquitoMisionLaGavia(
  saldoFiniquito: number,
  mesesEntrega: number,
): number {
  const tasaMensual = MISION_LA_GAVIA_SIMULADOR_CONFIG.tasaAnual / 12;
  return round2(fv(tasaMensual, mesesEntrega, 0, -saldoFiniquito));
}
