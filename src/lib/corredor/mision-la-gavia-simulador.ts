/**
 * Simulador Misión La Gavia — departamentos.
 * Todos los esquemas usan la misma lógica comercial (como Libre / Excel):
 * porcentajes sobre precio de contado; enganche inmediato; mensualidades con PMT;
 * finiquito con FV a la entrega; total = suma del plan.
 */

import {
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
  MisionLaGaviaDiaPago,
  MisionLaGaviaEsquemaConfig,
  MisionLaGaviaEsquemaId,
  MisionLaGaviaFilaPago,
  MisionLaGaviaLibreConfig,
  MisionLaGaviaSimulacionInput,
  MisionLaGaviaSimulacionResult,
  MisionLaGaviaUnidadRecord,
} from "@/lib/corredor/mision-la-gavia-simulador-data-types";
import type { DisponibilidadUnidad } from "@/lib/data";

export type {
  MisionLaGaviaDiaPago,
  MisionLaGaviaEsquemaConfig,
  MisionLaGaviaEsquemaId,
  MisionLaGaviaFilaPago,
  MisionLaGaviaLibreConfig,
  MisionLaGaviaMsiConfig,
  MisionLaGaviaSimulacionInput,
  MisionLaGaviaSimulacionResult,
  MisionLaGaviaUnidadRecord,
} from "@/lib/corredor/mision-la-gavia-simulador-data-types";

/** Default comercial: fin de mes (antes se usaba EOMONTH; el día 15 es la otra opción del asesor). */
export const MISION_LA_GAVIA_DIA_PAGO_DEFAULT: MisionLaGaviaDiaPago = "fin-mes";

export function labelDiaPagoMisionLaGavia(dia: MisionLaGaviaDiaPago): string {
  return dia === "dia-15" ? "día 15 de cada mes" : "último día de cada mes";
}

/**
 * Fecha de pago anclada a día 15 o fin de mes, sin desbordar por meses cortos
 * (evita 31 ene + 1 mes → 3 mar).
 */
export function fechaPagoCalendarioMisionLaGavia(
  fechaCotizacion: Date,
  offsetMeses: number,
  diaPago: MisionLaGaviaDiaPago = MISION_LA_GAVIA_DIA_PAGO_DEFAULT,
): Date {
  const year = fechaCotizacion.getFullYear();
  const month = fechaCotizacion.getMonth() + offsetMeses;
  if (diaPago === "fin-mes") {
    return new Date(year, month + 1, 0);
  }
  return new Date(year, month, 15);
}

const round2 = roundMoney;
const COEF_RENTA = 0.0055;

/**
 * Entrega comercial oficial etapa 1 (dic 2027).
 * Las unidades generadas del Excel traen `entregaIso: null` y el workbook
 * solo aporta `mesesEntregaDefault: 24` (meses desde la cotización), lo cual
 * desplaza la fecha según el día de la cotización. Usamos la fecha fija.
 */
export const MISION_LA_GAVIA_ENTREGA_ETAPA1_ISO = "2027-12-01";

/** Esquemas fijos del Excel (MSI unificado; 6msi/12msi/15-85 quedan como alias). */
export const MISION_LA_GAVIA_ESQUEMAS_FIJOS: MisionLaGaviaEsquemaId[] = [
  "contado",
  "msi",
  "30-70",
];

export const MISION_LA_GAVIA_ESQUEMAS: MisionLaGaviaEsquemaId[] = [
  ...MISION_LA_GAVIA_ESQUEMAS_FIJOS,
  "libre",
];

/** Defaults Libre — misma lógica comercial que Pasaje. */
export const MISION_LA_GAVIA_LIBRE_DEFAULTS = {
  enganchePct: 0.2,
  mensualidadesPct: 0.15,
} as const;

/** MSI unificado: mensualidades editables (antes 6MSI / 12MSI). */
export const MISION_LA_GAVIA_MSI_DEFAULTS = {
  enganchePct: 0.2,
  /** Pagos mensuales por defecto (equivalente al antiguo 12MSI = 11 cuotas). */
  numMensualidades: 11,
  minMensualidades: 1,
  maxMensualidades: 36,
} as const;

const LIBRE_ESQUEMA_CONFIG: MisionLaGaviaEsquemaConfig = {
  id: "libre",
  label: "Libre",
  descuentoPct: 0,
  enganchePct: MISION_LA_GAVIA_LIBRE_DEFAULTS.enganchePct,
  meses: "varia",
  finiquitoPct: 1 - MISION_LA_GAVIA_LIBRE_DEFAULTS.enganchePct - MISION_LA_GAVIA_LIBRE_DEFAULTS.mensualidadesPct,
};

const MSI_ESQUEMA_CONFIG: MisionLaGaviaEsquemaConfig = {
  id: "msi",
  label: "MSI",
  descuentoPct: 0.135,
  enganchePct: MISION_LA_GAVIA_MSI_DEFAULTS.enganchePct,
  meses: "varia",
  finiquitoPct: 0,
};

/** Normaliza aliases 6msi/12msi → msi; 15-85 → 30-70 (esquema retirado de UI). */
export function normalizeMisionLaGaviaEsquema(
  esquema: MisionLaGaviaEsquemaId,
): MisionLaGaviaEsquemaId {
  if (esquema === "6msi" || esquema === "12msi") return "msi";
  if (esquema === "15-85") return "30-70";
  return esquema;
}

export function defaultMsiMensualidadesForEsquema(
  esquema: MisionLaGaviaEsquemaId,
): number {
  if (esquema === "6msi") return 5;
  if (esquema === "12msi") return 11;
  return MISION_LA_GAVIA_MSI_DEFAULTS.numMensualidades;
}

export function clampMsiMensualidades(value: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return MISION_LA_GAVIA_MSI_DEFAULTS.numMensualidades;
  return Math.min(
    MISION_LA_GAVIA_MSI_DEFAULTS.maxMensualidades,
    Math.max(MISION_LA_GAVIA_MSI_DEFAULTS.minMensualidades, n),
  );
}

export function isMisionLaGaviaSimuladorDesarrollo(
  desarrolloId: string | null | undefined,
): boolean {
  return isMisionLaGaviaDesarrollo(desarrolloId);
}

function excelEsquemaById(id: string) {
  return MISION_LA_GAVIA_SIMULADOR_CONFIG.esquemasPago.find((item) => item.id === id);
}

export function getMisionLaGaviaEsquemas(): MisionLaGaviaEsquemaConfig[] {
  const fromExcel = MISION_LA_GAVIA_SIMULADOR_CONFIG.esquemasPago
    .filter(
      (item) =>
        item.id !== "6msi" && item.id !== "12msi" && item.id !== "15-85",
    )
    .map((item) => ({
      id: item.id as MisionLaGaviaEsquemaId,
      label: item.label,
      descuentoPct: item.descuentoPct,
      enganchePct: item.enganchePct,
      meses: item.meses,
      finiquitoPct: item.finiquitoPct,
    }));

  const cfg12 = excelEsquemaById("12msi");
  const msi: MisionLaGaviaEsquemaConfig = {
    ...MSI_ESQUEMA_CONFIG,
    descuentoPct: cfg12?.descuentoPct ?? MSI_ESQUEMA_CONFIG.descuentoPct,
    enganchePct: cfg12?.enganchePct ?? MSI_ESQUEMA_CONFIG.enganchePct,
  };

  const contadoIdx = fromExcel.findIndex((item) => item.id === "contado");
  const withMsi =
    contadoIdx >= 0
      ? [
          ...fromExcel.slice(0, contadoIdx + 1),
          msi,
          ...fromExcel.slice(contadoIdx + 1),
        ]
      : [msi, ...fromExcel];

  return [...withMsi, LIBRE_ESQUEMA_CONFIG];
}

export function getMisionLaGaviaEsquemaConfig(
  esquema: MisionLaGaviaEsquemaId,
): MisionLaGaviaEsquemaConfig | undefined {
  const normalized = normalizeMisionLaGaviaEsquema(esquema);
  if (normalized === "libre") {
    return LIBRE_ESQUEMA_CONFIG;
  }
  if (normalized === "msi") {
    return getMisionLaGaviaEsquemas().find((item) => item.id === "msi");
  }
  return getMisionLaGaviaEsquemas().find((item) => item.id === normalized);
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

/**
 * Motor comercial unificado (misma lógica que Libre / Excel):
 * - % sobre precio de contado
 * - enganche = % × contado (pago inmediato)
 * - mensualidades = PMT sobre % × contado
 * - finiquito = FV sobre % × contado a la fecha de entrega
 * - total venta = suma de esos flujos
 */
function calcularPlanDesdeContado(input: {
  precioContado: number;
  enganchePct: number;
  mensualidadesPct: number;
  finiquitoPct: number;
  numMensualidades: number;
  mesesHastaFiniquito: number;
  tasaMensual: number;
  fechaCotizacion: Date;
  fechaFiniquito: Date;
}) {
  const {
    precioContado,
    enganchePct,
    mensualidadesPct,
    finiquitoPct,
    numMensualidades,
    mesesHastaFiniquito,
    tasaMensual,
    fechaCotizacion,
    fechaFiniquito,
  } = input;

  const enganche = round2(precioContado * enganchePct);
  const n = numMensualidades > 0 && mensualidadesPct > 0 ? numMensualidades : 0;
  const mensualidad =
    n > 0
      ? round2(pmt(tasaMensual, n, -(precioContado * mensualidadesPct)))
      : 0;
  const finiquito =
    finiquitoPct > 0
      ? round2(fv(tasaMensual, Math.max(1, mesesHastaFiniquito), 0, -(precioContado * finiquitoPct)))
      : 0;
  const precioTotal = round2(enganche + mensualidad * n + finiquito);

  const fechaPrimerPago =
    n > 0
      ? fechaPagoCalendarioMisionLaGavia(
          fechaCotizacion,
          1,
          MISION_LA_GAVIA_DIA_PAGO_DEFAULT,
        )
      : undefined;
  const fechaUltimoPago =
    n > 0
      ? fechaPagoCalendarioMisionLaGavia(
          fechaCotizacion,
          n,
          MISION_LA_GAVIA_DIA_PAGO_DEFAULT,
        )
      : undefined;

  return {
    precioContado,
    precioTotal,
    enganche,
    enganchePct,
    mensualidad: n > 0 ? mensualidad : undefined,
    numMensualidades: n > 0 ? n : undefined,
    fechaPrimerPago,
    fechaUltimoPago,
    finiquito: finiquito > 0 ? finiquito : undefined,
    finiquitoPct: finiquitoPct > 0 ? finiquitoPct : undefined,
    fechaFiniquito: finiquito > 0 ? fechaFiniquito : undefined,
  };
}

function descripcionPlanDesdeContado(input: {
  label: string;
  enganchePct: number;
  mensualidadesPct: number;
  numMensualidades?: number;
  finiquitoPct: number;
  fechaFiniquito?: Date;
}): string {
  const partes = [
    `enganche ${formatPctShort(input.enganchePct)} del contado`,
    input.numMensualidades && input.mensualidadesPct > 0
      ? `${input.numMensualidades} mensualidades (${formatPctShort(input.mensualidadesPct)} del contado)`
      : null,
    input.finiquitoPct > 0
      ? `finiquito ${formatPctShort(input.finiquitoPct)} del contado${
          input.fechaFiniquito ? ` a ${formatMonthYear(input.fechaFiniquito)}` : ""
        }`
      : null,
  ].filter(Boolean);
  return `${input.label}: ${partes.join(" + ")}. Los porcentajes parten del precio de contado; el total de venta es la suma del plan.`;
}

export function simularMisionLaGavia(
  input: MisionLaGaviaSimulacionInput,
): MisionLaGaviaSimulacionResult {
  const esquema = normalizeMisionLaGaviaEsquema(input.esquema);
  const cfg = getMisionLaGaviaEsquemaConfig(esquema);
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
    esquema,
    esquemaLabel: cfg?.label ?? esquema,
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

  const vsLista = (precioTotal: number) =>
    precioListaRef > 0 ? 1 - precioTotal / precioListaRef : 0;
  const precioContado = unidad.precioContado;
  const mesesHastaEntrega = Math.max(
    1,
    monthsBetween(startOfMonth(fechaCotizacion), fechaEntrega),
  );

  if (precioContado <= 0 && esquema !== "libre") {
    return { ...base, error: "Precio contado no disponible" };
  }

  if (esquema === "contado" || esquema === "30-70") {
    const enganchePct = cfg.enganchePct;
    const finiquitoPct =
      cfg.finiquitoPct > 0 ? cfg.finiquitoPct : Math.max(0, 1 - enganchePct);
    const plan = calcularPlanDesdeContado({
      precioContado,
      enganchePct,
      mensualidadesPct: 0,
      finiquitoPct,
      numMensualidades: 0,
      mesesHastaFiniquito: mesesHastaEntrega,
      tasaMensual,
      fechaCotizacion,
      fechaFiniquito: fechaEntrega,
    });
    return {
      ...base,
      ...plan,
      esquemaLabel: cfg.label,
      descuentoVsListaPct: vsLista(plan.precioTotal),
      descripcionPago: descripcionPlanDesdeContado({
        label: cfg.label,
        enganchePct,
        mensualidadesPct: 0,
        finiquitoPct,
        fechaFiniquito: fechaEntrega,
      }),
    };
  }

  if (esquema === "msi" || esquema === "6msi" || esquema === "12msi") {
    const cfgMsi = getMisionLaGaviaEsquemaConfig("msi") ?? MSI_ESQUEMA_CONFIG;
    const enganchePct = cfgMsi.enganchePct || MISION_LA_GAVIA_MSI_DEFAULTS.enganchePct;
    const mensualidadesPct = Math.max(0, 1 - enganchePct);
    const numMensualidades = clampMsiMensualidades(
      input.msi?.numMensualidades ??
        (esquema === "6msi" || esquema === "12msi"
          ? defaultMsiMensualidadesForEsquema(esquema)
          : MISION_LA_GAVIA_MSI_DEFAULTS.numMensualidades),
    );
    const plan = calcularPlanDesdeContado({
      precioContado,
      enganchePct,
      mensualidadesPct,
      finiquitoPct: 0,
      numMensualidades,
      mesesHastaFiniquito: mesesHastaEntrega,
      tasaMensual,
      fechaCotizacion,
      fechaFiniquito: fechaEntrega,
    });
    return {
      ...base,
      ...plan,
      esquema: "msi",
      esquemaLabel: `MSI · ${numMensualidades} mensualidades`,
      descuentoVsListaPct: vsLista(plan.precioTotal),
      descripcionPago: descripcionPlanDesdeContado({
        label: "MSI",
        enganchePct,
        mensualidadesPct,
        numMensualidades,
        finiquitoPct: 0,
      }),
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

  const mesesHastaFiniquito = Math.max(
    1,
    monthsBetween(startOfMonth(fechaCotizacion), fechaFiniquito),
  );
  const numMensualidades =
    mensualidadesPct > 0 ? Math.max(1, mesesHastaFiniquito - 1) : 0;

  const plan = calcularPlanDesdeContado({
    precioContado,
    enganchePct,
    mensualidadesPct,
    finiquitoPct,
    numMensualidades,
    mesesHastaFiniquito,
    tasaMensual,
    fechaCotizacion,
    fechaFiniquito,
  });

  return {
    ...base,
    esquemaLabel: "Libre",
    ...plan,
    descuentoVsListaPct:
      precioListaRef > 0 ? 1 - plan.precioTotal / precioListaRef : 0,
    descripcionPago: descripcionPlanDesdeContado({
      label: "Libre",
      enganchePct,
      mensualidadesPct,
      numMensualidades: plan.numMensualidades,
      finiquitoPct,
      fechaFiniquito,
    }),
    error,
  };
}

export function simularTodosEsquemasMisionLaGavia(
  unidad: MisionLaGaviaUnidadRecord,
  fechaCotizacion?: Date,
  descuentoEspecialPct?: number,
): MisionLaGaviaSimulacionResult[] {
  return MISION_LA_GAVIA_ESQUEMAS_FIJOS.map((esquema) =>
    simularMisionLaGavia({
      unidad,
      esquema,
      fechaCotizacion,
      descuentoEspecialPct,
      msi:
        esquema === "msi"
          ? { numMensualidades: MISION_LA_GAVIA_MSI_DEFAULTS.numMensualidades }
          : undefined,
    }),
  );
}

export function formatPctShort(value: number): string {
  return `${(value * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

export type BuildCalendarioPagosMisionLaGaviaOpts = {
  fechaCotizacion?: Date;
  /** Día fijo de enganche y mensualidades. El finiquito respeta la fecha de entrega pactada. */
  diaPago?: MisionLaGaviaDiaPago;
};

/**
 * Expande el resultado agregado a un calendario de pagos (fecha + monto),
 * mismo contrato visual que el plan de pagos de Investti.
 */
export function buildCalendarioPagosMisionLaGavia(
  result: MisionLaGaviaSimulacionResult,
  fechaCotizacionOrOpts: Date | BuildCalendarioPagosMisionLaGaviaOpts = new Date(),
): MisionLaGaviaFilaPago[] {
  if (result.error || result.precioTotal <= 0) {
    return [];
  }

  const opts: BuildCalendarioPagosMisionLaGaviaOpts =
    fechaCotizacionOrOpts instanceof Date
      ? { fechaCotizacion: fechaCotizacionOrOpts }
      : fechaCotizacionOrOpts;
  const fechaCotizacion = opts.fechaCotizacion ?? new Date();
  const diaPago = opts.diaPago ?? MISION_LA_GAVIA_DIA_PAGO_DEFAULT;

  const filas: MisionLaGaviaFilaPago[] = [];
  let numero = 1;
  const fechaEnganche = fechaPagoCalendarioMisionLaGavia(fechaCotizacion, 0, diaPago);

  if (result.enganche > 0) {
    filas.push({
      numero: numero++,
      fechaPago: fechaEnganche,
      pagoTotal: result.enganche,
      tipo: "enganche",
      concepto: `Enganche ${formatPctShort(result.enganchePct)} del contado`,
    });
  }

  const numMensualidades = result.numMensualidades ?? 0;
  const mensualidad = result.mensualidad ?? 0;
  if (numMensualidades > 0 && mensualidad > 0) {
    for (let i = 0; i < numMensualidades; i += 1) {
      filas.push({
        numero: numero++,
        // Enganche = mes 0; primera mensualidad = mes siguiente (igual que antes con EOMONTH+1).
        fechaPago: fechaPagoCalendarioMisionLaGavia(fechaCotizacion, i + 1, diaPago),
        pagoTotal: mensualidad,
        tipo: "mensualidad",
        concepto: `Mensualidad ${i + 1} de ${numMensualidades}`,
      });
    }
  }

  if (result.finiquito && result.finiquito > 0) {
    filas.push({
      numero: numero++,
      fechaPago: result.fechaFiniquito ?? result.fechaUltimoPago ?? fechaEnganche,
      pagoTotal: result.finiquito,
      tipo: "finiquito",
      concepto: `Finiquito ${formatPctShort(result.finiquitoPct ?? 0)} del contado`,
    });
  }

  return filas;
}

export function buildMisionLaGaviaSimulacionSummary(
  result: MisionLaGaviaSimulacionResult,
  desarrolloNombre: string,
  clienteNombre?: string,
  fechaCotizacion?: Date,
  diaPago: MisionLaGaviaDiaPago = MISION_LA_GAVIA_DIA_PAGO_DEFAULT,
): string {
  const calendario = buildCalendarioPagosMisionLaGavia(result, {
    fechaCotizacion: fechaCotizacion ?? new Date(),
    diaPago,
  });
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
    calendario.length ? "Plan de pagos:" : null,
    ...calendario.map(
      (fila) =>
        `  ${fila.numero}. ${formatMonthYear(fila.fechaPago)} · ${fila.concepto}: ${formatPrice(fila.pagoTotal)}`,
    ),
    calendario.length ? "" : null,
    "Ejercicio de rentas (referencial):",
    `  · Renta mensual: ${formatPrice(result.rentaMensual)}`,
    `  · Rendimiento anual estimado: ${formatPctShort(result.rendimientoRentasAnual)}`,
    "",
    "* Vigencia 10 días naturales, sujeto a cambio sin previo aviso (tarjetas de proceso).",
    "* Apartado $50,000 MXN en una sola exhibición; resto conforme al plan comercial pactado.",
    "* Valores referenciales; no constituye preaprobación ni compromete al desarrollo.",
    "* Ver términos y condiciones completos en el PDF de cotización.",
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
