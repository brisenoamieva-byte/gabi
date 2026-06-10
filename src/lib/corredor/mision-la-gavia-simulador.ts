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
import { roundMoney, formatPrice } from "@/lib/format/money";
import { isMisionLaGaviaDesarrollo } from "@/lib/catalog/mision-la-gavia";
import {
  MISION_LA_GAVIA_SIMULADOR_CONFIG,
} from "@/lib/corredor/mision-la-gavia-simulador-config.generated";
import { MISION_LA_GAVIA_UNIDADES } from "@/lib/corredor/mision-la-gavia-unidades.generated";
import type {
  MisionLaGaviaEsquemaConfig,
  MisionLaGaviaEsquemaId,
  MisionLaGaviaSimulacionInput,
  MisionLaGaviaSimulacionResult,
  MisionLaGaviaUnidadRecord,
} from "@/lib/corredor/mision-la-gavia-simulador-data-types";
import type { DisponibilidadUnidad } from "@/lib/data";

export type {
  MisionLaGaviaEsquemaConfig,
  MisionLaGaviaEsquemaId,
  MisionLaGaviaSimulacionInput,
  MisionLaGaviaSimulacionResult,
  MisionLaGaviaUnidadRecord,
} from "@/lib/corredor/mision-la-gavia-simulador-data-types";

const round2 = roundMoney;
const COEF_RENTA = 0.0055;

export const MISION_LA_GAVIA_ESQUEMAS: MisionLaGaviaEsquemaId[] = [
  "contado",
  "6msi",
  "12msi",
  "30-70",
  "15-85",
];

export function isMisionLaGaviaSimuladorDesarrollo(
  desarrolloId: string | null | undefined,
): boolean {
  return isMisionLaGaviaDesarrollo(desarrolloId);
}

export function getMisionLaGaviaEsquemas(): MisionLaGaviaEsquemaConfig[] {
  return MISION_LA_GAVIA_SIMULADOR_CONFIG.esquemasPago.map((item) => ({
    id: item.id as MisionLaGaviaEsquemaId,
    label: item.label,
    descuentoPct: item.descuentoPct,
    enganchePct: item.enganchePct,
    meses: item.meses,
    finiquitoPct: item.finiquitoPct,
  }));
}

export function getMisionLaGaviaEsquemaConfig(
  esquema: MisionLaGaviaEsquemaId,
): MisionLaGaviaEsquemaConfig | undefined {
  return getMisionLaGaviaEsquemas().find((item) => item.id === esquema);
}

export function findMisionLaGaviaUnidadByCode(
  unidadCode: string,
): MisionLaGaviaUnidadRecord | undefined {
  return MISION_LA_GAVIA_UNIDADES.find((item) => item.unidad === unidadCode);
}

export function resolveMisionLaGaviaUnidadFromInventario(
  inventario: DisponibilidadUnidad[] | undefined,
  unidadId: string | undefined,
  unidadCode?: string,
): MisionLaGaviaUnidadRecord | undefined {
  if (unidadCode) {
    return findMisionLaGaviaUnidadByCode(unidadCode);
  }
  if (!unidadId || !inventario?.length) {
    return undefined;
  }
  const row = inventario.find((item) => item.id === unidadId);
  if (!row?.unidad) {
    return undefined;
  }
  return findMisionLaGaviaUnidadByCode(row.unidad);
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
  const unidad = input.unidad;
  const fechaEntrega = resolveFechaEntrega(unidad, fechaCotizacion);
  const entregaLabel = formatMonthYear(fechaEntrega);
  const rentaMensual = round2(unidad.precioLista * COEF_RENTA);
  const rendimientoRentasAnual =
    unidad.precioLista > 0 ? (rentaMensual * 12) / unidad.precioLista : 0;

  const base: MisionLaGaviaSimulacionResult = {
    esquema: input.esquema,
    esquemaLabel: cfg?.label ?? input.esquema,
    unidad: unidad.unidad,
    modelo: unidad.modelo,
    edificio: unidad.edificio,
    lado: unidad.lado,
    m2Totales: unidad.m2Totales,
    precioLista: unidad.precioLista,
    precioTotal: 0,
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

  if (unidad.precioLista <= 0) {
    return { ...base, error: "Precio lista no disponible" };
  }

  const esquema = input.esquema;

  if (esquema === "contado") {
    const precioTotal = unidad.precioContado;
    const plazo = simularPlazoFiniquito(unidad, cfg, fechaEntrega, precioTotal);
    return {
      ...base,
      ...plazo,
      precioTotal,
      descuentoVsListaPct: 1 - precioTotal / unidad.precioLista,
      descripcionPago: `Contado: enganche ${Math.round(cfg.enganchePct * 100)}% + finiquito ${Math.round(cfg.finiquitoPct * 100)}% en ${entregaLabel}`,
    };
  }

  if (esquema === "6msi" || esquema === "12msi") {
    const msi = simularMsi(unidad, cfg, fechaCotizacion, tasaMensual);
    return {
      ...base,
      ...msi,
      descuentoVsListaPct: 1 - msi.precioTotal / unidad.precioLista,
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
      descuentoVsListaPct: 1 - precioTotal / unidad.precioLista,
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
      descuentoVsListaPct: 1 - precioTotal / unidad.precioLista,
    };
  }

  return { ...base, error: "Esquema no soportado" };
}

export function simularTodosEsquemasMisionLaGavia(
  unidad: MisionLaGaviaUnidadRecord,
  fechaCotizacion?: Date,
): MisionLaGaviaSimulacionResult[] {
  return MISION_LA_GAVIA_ESQUEMAS.map((esquema) =>
    simularMisionLaGavia({ unidad, esquema, fechaCotizacion }),
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
    `Precio lista mar26: ${formatPrice(result.precioLista)}`,
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
