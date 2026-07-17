/**
 * Simulador financiero de Pasaje Álamos.
 * Replica las fórmulas del Excel oficial "Simulador deptos/oficinas 1may26.xlsx".
 *
 * Esquemas soportados:
 *  1. Contado          — 100% al firmar, descuento fijo.
 *  2. Contado diferido — Enganche % + 33 mensualidades PMT al 9% anual.
 *  3. MSI              — Enganche % + N mensualidades hasta entrega (PMT con interés "absorbido").
 *  4. 30-30-40         — 30% enganche + 30% en N-1 mensualidades + 40% finiquito a entrega.
 *  5. Libre            — Enganche / mensualidades / finiquito configurables.
 *  6. Libre sin mens.  — Enganche + 1 pago + finiquito (sin mensualidades).
 *
 * Toda la matemática toma como base el PRECIO CONTADO (precio lista × (1 - descuentoContado)).
 * El interés se aplica solo a los esquemas con financiamiento.
 */

import {
  clampDescuentoEspecialPct,
  factorDescuentoEspecial,
} from "@/lib/comercial/descuento-especial";
import { roundMoney } from "@/lib/format/money";

export type PasajeUnidadTipo = "departamento" | "oficina";

export type PasajeEsquemaPago =
  | "contado"
  | "contado-diferido"
  | "msi"
  | "30-30-40"
  | "libre"
  | "libre-sin-mensualidades";

export type PasajeSimuladorConfig = {
  /** Tasa anual (default 9%). */
  tasaAnual: number;
  /** Descuento contado aplicado al precio lista (default 15.9%). */
  descuentoContadoPct: number;
  /** Fecha de entrega del desarrollo. */
  fechaEntrega: Date;
  /** Coeficiente de renta mensual (porcentaje del precio lista). */
  coeficienteRentaMensual: number;
  /** Plusvalía anual estimada (porcentaje). */
  plusvaliaAnual: number;
  /** Cantidad fija de mensualidades en el esquema "Contado diferido". */
  mensualidadesContadoDiferido: number;
  /** Enganches por defecto por esquema. */
  defaults: {
    contadoDiferidoEnganche: number;
    msiEnganche: number;
    libreEnganche: number;
    libreMensualidades: number;
    libreSinMensEnganche: number;
    libreSinMensPago: number;
  };
};

/** Entrega Pasaje Álamos (dic 2028) — alineado al calendario del Excel deptos.xlsx. */
export const PASAJE_FECHA_ENTREGA = new Date(2028, 11, 1);

const baseDefaults: PasajeSimuladorConfig = {
  tasaAnual: 0.09,
  descuentoContadoPct: 0.159,
  fechaEntrega: PASAJE_FECHA_ENTREGA,
  coeficienteRentaMensual: 0.0055,
  plusvaliaAnual: 0.09,
  mensualidadesContadoDiferido: 33,
  defaults: {
    contadoDiferidoEnganche: 0.5,
    msiEnganche: 0.3,
    libreEnganche: 0.2,
    libreMensualidades: 0.15,
    libreSinMensEnganche: 0.2,
    libreSinMensPago: 0.2,
  },
};

const oficinasDefaults: PasajeSimuladorConfig = {
  ...baseDefaults,
  coeficienteRentaMensual: 0.006,
  defaults: {
    contadoDiferidoEnganche: 0.3,
    msiEnganche: 0.6,
    libreEnganche: 0.15,
    libreMensualidades: 0.15,
    libreSinMensEnganche: 0.15,
    libreSinMensPago: 0.15,
  },
};

export const getPasajeSimuladorConfig = (
  tipo: PasajeUnidadTipo,
): PasajeSimuladorConfig => (tipo === "oficina" ? oficinasDefaults : baseDefaults);

/**
 * Excel PMT(rate, nper, pv, fv=0, type=0).
 * Devuelve el pago periódico; pv negativo significa préstamo recibido.
 */
export const pmt = (
  rate: number,
  nper: number,
  pv: number,
  fv = 0,
  type: 0 | 1 = 0,
): number => {
  if (nper <= 0) {
    return 0;
  }
  if (rate === 0) {
    return -(pv + fv) / nper;
  }
  const factor = Math.pow(1 + rate, nper);
  const payment = (-(pv * factor + fv) * rate) / (factor - 1);
  return type === 1 ? payment / (1 + rate) : payment;
};

/**
 * Excel FV(rate, nper, pmt, pv=0, type=0).
 * Útil para capitalizar un monto N períodos al interés periódico.
 */
export const fv = (
  rate: number,
  nper: number,
  payment: number,
  pv = 0,
  type: 0 | 1 = 0,
): number => {
  if (rate === 0) {
    return -(pv + payment * nper);
  }
  const factor = Math.pow(1 + rate, nper);
  return -(pv * factor + payment * (1 + rate * type) * ((factor - 1) / rate));
};

/** Primer día del mes (para contar plazos como en la Hoja1 del Excel). */
export const startOfMonth = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1);

/** Meses entre dos fechas, considerando día del mes (similar a DATEDIF("m")). */
export const monthsBetween = (start: Date, end: Date): number => {
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
};

/** Suma N meses a la fecha (similar a Excel EDATE). */
export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  return result;
};

/** Último día del mes desplazado N meses (similar a Excel EOMONTH). */
export const endOfMonth = (date: Date, months = 0): Date => {
  return new Date(date.getFullYear(), date.getMonth() + months + 1, 0);
};

export type PasajeLibreConfig = {
  enganchePct: number;
  mensualidadesPct: number;
  fechaFiniquito?: Date;
};

export type PasajeLibreSinMensConfig = {
  enganchePct: number;
  pagoPct: number;
  fechaPagoIntermedio?: Date;
  fechaFiniquito?: Date;
};

export type PasajeSimuladorInput = {
  precioLista: number;
  tipo: PasajeUnidadTipo;
  esquema: PasajeEsquemaPago;
  fechaCotizacion?: Date;
  config?: Partial<PasajeSimuladorConfig>;
  libre?: PasajeLibreConfig;
  libreSinMens?: PasajeLibreSinMensConfig;
  /** Descuento especial gerente/director (fracción 0–0.015), sobre precio contado. */
  descuentoEspecialPct?: number;
};

export type PasajeSimuladorResultado = {
  esquema: PasajeEsquemaPago;
  esquemaLabel: string;
  precioLista: number;
  precioContado: number;
  precioTotal: number;
  descuentoContadoPct: number;
  /** Descuento especial aplicado (fracción 0–0.015). */
  descuentoEspecialPct: number;
  descuentoEfectivoPct: number;
  ahorroContado: number;
  enganche: number;
  enganchePct: number;
  mensualidadCliente?: number;
  numMensualidades?: number;
  fechaPrimerMes?: Date;
  fechaUltimoMes?: Date;
  pagoIntermedio?: number;
  pagoIntermedioPct?: number;
  fechaPagoIntermedio?: Date;
  finiquito?: number;
  finiquitoPct?: number;
  fechaFiniquito?: Date;
  rentaMensual: number;
  rendimientoRentasAnual: number;
  rendimientoTotalAnual: number;
  error?: string;
};

export const PASAJE_ESQUEMA_LABELS: Record<PasajeEsquemaPago, string> = {
  contado: "Contado",
  "contado-diferido": "Contado diferido",
  msi: "Meses sin intereses",
  "30-30-40": "30-30-40",
  libre: "Libre",
  "libre-sin-mensualidades": "Libre sin mensualidades",
};

const round2 = roundMoney;

export const computePasajeSimulador = (
  input: PasajeSimuladorInput,
): PasajeSimuladorResultado => {
  const baseConfig = getPasajeSimuladorConfig(input.tipo);
  const config: PasajeSimuladorConfig = { ...baseConfig, ...input.config };
  const fechaCotizacion = input.fechaCotizacion ?? new Date();

  const precioLista = Math.max(0, input.precioLista || 0);
  const descuentoEspecialPct = clampDescuentoEspecialPct(
    input.descuentoEspecialPct ?? 0,
  );
  const precioContadoBase = round2(precioLista * (1 - config.descuentoContadoPct));
  const precioContado = round2(
    precioContadoBase * factorDescuentoEspecial(descuentoEspecialPct),
  );
  const tasaMensual = config.tasaAnual / 12;
  const mesesHastaEntrega = monthsBetween(
    startOfMonth(fechaCotizacion),
    config.fechaEntrega,
  );

  const rentaMensual = round2(precioLista * config.coeficienteRentaMensual);
  const rendimientoRentasAnual =
    precioLista > 0 ? (rentaMensual * 12) / precioLista : 0;
  const rendimientoTotalAnual = rendimientoRentasAnual + config.plusvaliaAnual;
  const descuentoEfectivoBase =
    precioLista > 0 ? 1 - precioContado / precioLista : config.descuentoContadoPct;

  const baseResult: PasajeSimuladorResultado = {
    esquema: input.esquema,
    esquemaLabel: PASAJE_ESQUEMA_LABELS[input.esquema],
    precioLista,
    precioContado,
    precioTotal: precioContado,
    descuentoContadoPct: config.descuentoContadoPct,
    descuentoEspecialPct,
    descuentoEfectivoPct: descuentoEfectivoBase,
    ahorroContado: round2(precioLista - precioContado),
    enganche: 0,
    enganchePct: 0,
    rentaMensual,
    rendimientoRentasAnual,
    rendimientoTotalAnual,
  };

  if (precioLista <= 0) {
    return { ...baseResult, error: "Precio lista no disponible" };
  }

  const firstPaymentDate = endOfMonth(fechaCotizacion, 1);

  switch (input.esquema) {
    case "contado": {
      return {
        ...baseResult,
        precioTotal: precioContado,
        enganche: precioContado,
        enganchePct: 1,
        finiquito: 0,
        finiquitoPct: 0,
      };
    }

    case "contado-diferido": {
      const enganchePct = config.defaults.contadoDiferidoEnganche;
      const numMensualidades = config.mensualidadesContadoDiferido;
      const enganche = round2(precioContado * enganchePct);
      const saldo = precioContado - enganche;
      const mensualidad = round2(pmt(tasaMensual, numMensualidades, -saldo));
      const total = round2(enganche + mensualidad * numMensualidades);
      const fechaUltimoMes = addMonths(firstPaymentDate, numMensualidades - 1);

      return {
        ...baseResult,
        precioTotal: total,
        descuentoEfectivoPct: precioLista > 0 ? 1 - total / precioLista : 0,
        enganche,
        enganchePct,
        mensualidadCliente: mensualidad,
        numMensualidades,
        fechaPrimerMes: firstPaymentDate,
        fechaUltimoMes,
      };
    }

    case "msi": {
      // El total se infla absorbiendo el interés; la mensualidad mostrada
      // al cliente NO incluye interés ((total - enganche)/N).
      const enganchePct = config.defaults.msiEnganche;
      const numMensualidades = Math.max(1, mesesHastaEntrega);
      // Total real con interés = enganche% × contado + PMT(rate, N, -(1-eng%)*contado) × N
      const financiable = precioContado * (1 - enganchePct);
      const cuotaConInteres = pmt(tasaMensual, numMensualidades, -financiable);
      const totalReal = round2(precioContado * enganchePct + cuotaConInteres * numMensualidades);
      const engancheCliente = round2(totalReal * enganchePct);
      const mensualidadCliente = round2((totalReal - engancheCliente) / numMensualidades);
      const fechaUltimoMes = config.fechaEntrega;

      return {
        ...baseResult,
        precioTotal: totalReal,
        descuentoEfectivoPct: precioLista > 0 ? 1 - totalReal / precioLista : 0,
        enganche: engancheCliente,
        enganchePct,
        mensualidadCliente,
        numMensualidades,
        fechaPrimerMes: firstPaymentDate,
        fechaUltimoMes,
      };
    }

    case "30-30-40": {
      // Réplica hoja «Cálculos» del Excel: P9 = filas de calendario, PMT en P9-2, FV en P9-1.
      const filasCalendario = mesesHastaEntrega + 1;
      const numMensualidades = Math.max(1, filasCalendario - 2);
      const periodosFiniquito = Math.max(1, filasCalendario - 1);
      const fechaUltimoMes = addMonths(firstPaymentDate, numMensualidades - 1);

      const engancheCapital = round2(precioContado * 0.3);
      const mensualidadConInteres = pmt(
        tasaMensual,
        numMensualidades,
        -(precioContado * 0.3),
      );
      const finiquitoCapitalizado = fv(
        tasaMensual,
        periodosFiniquito,
        0,
        -(precioContado * 0.4),
      );
      const totalReal = round2(
        engancheCapital +
          mensualidadConInteres * numMensualidades +
          finiquitoCapitalizado,
      );

      const enganche = round2(totalReal * 0.3);
      const mensualidadCliente = round2(
        numMensualidades > 0 ? (totalReal * 0.3) / numMensualidades : 0,
      );
      const finiquitoCliente = round2(
        totalReal - enganche - mensualidadCliente * numMensualidades,
      );

      return {
        ...baseResult,
        precioTotal: totalReal,
        descuentoEfectivoPct: precioLista > 0 ? 1 - totalReal / precioLista : 0,
        enganche,
        enganchePct: 0.3,
        mensualidadCliente,
        numMensualidades,
        fechaPrimerMes: firstPaymentDate,
        fechaUltimoMes,
        finiquito: finiquitoCliente,
        finiquitoPct: 0.4,
        fechaFiniquito: config.fechaEntrega,
      };
    }

    case "libre": {
      const enganchePct = input.libre?.enganchePct ?? config.defaults.libreEnganche;
      const mensualidadesPct = Math.max(
        0,
        Math.min(
          input.libre?.mensualidadesPct ?? config.defaults.libreMensualidades,
          1 - enganchePct,
        ),
      );
      const fechaFiniquito = input.libre?.fechaFiniquito ?? config.fechaEntrega;
      const finiquitoPct = Math.max(0, 1 - enganchePct - mensualidadesPct);

      let error: string | undefined;
      if (enganchePct < 0.15) {
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
      const fechaUltimoMes =
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
      const totalReal = round2(
        enganche + mensualidadConInteres * numMensualidades + finiquitoCapitalizado,
      );

      const mensualidadCliente = round2(
        numMensualidades > 0 ? (mensualidadesPct * totalReal) / numMensualidades : 0,
      );
      const finiquitoCliente = round2(finiquitoPct * totalReal);

      return {
        ...baseResult,
        precioTotal: totalReal,
        descuentoEfectivoPct: precioLista > 0 ? 1 - totalReal / precioLista : 0,
        enganche,
        enganchePct,
        mensualidadCliente,
        numMensualidades,
        fechaPrimerMes: numMensualidades > 0 ? firstPaymentDate : undefined,
        fechaUltimoMes,
        finiquito: finiquitoCliente,
        finiquitoPct,
        fechaFiniquito,
        error,
      };
    }

    case "libre-sin-mensualidades": {
      const enganchePct = input.libreSinMens?.enganchePct ?? config.defaults.libreSinMensEnganche;
      const pagoPct = Math.max(
        0,
        Math.min(
          input.libreSinMens?.pagoPct ?? config.defaults.libreSinMensPago,
          1 - enganchePct,
        ),
      );
      const fechaPago = input.libreSinMens?.fechaPagoIntermedio ?? config.fechaEntrega;
      const fechaFiniquito = input.libreSinMens?.fechaFiniquito ?? config.fechaEntrega;
      const finiquitoPct = Math.max(0, 1 - enganchePct - pagoPct);

      let error: string | undefined;
      if (enganchePct < 0.15) {
        error = "Enganche mínimo 15%.";
      } else if (enganchePct + pagoPct < 0.3) {
        error = "Enganche + pago intermedio deben sumar al menos 30%.";
      } else if (enganchePct + pagoPct > 1 + 1e-9) {
        error = "Los porcentajes suman más de 100%.";
      } else if (pagoPct > 0 && fechaPago.getTime() > fechaFiniquito.getTime()) {
        error = "La fecha del pago intermedio no puede ser posterior al finiquito.";
      }

      const mesesHastaPago = Math.max(
        1,
        monthsBetween(startOfMonth(fechaCotizacion), fechaPago),
      );
      const mesesHastaFiniquito = Math.max(
        1,
        monthsBetween(startOfMonth(fechaCotizacion), fechaFiniquito),
      );

      const enganche = round2(precioContado * enganchePct);
      const pagoCapitalizado =
        pagoPct > 0
          ? fv(tasaMensual, mesesHastaPago, 0, -(precioContado * pagoPct))
          : 0;
      const finiquitoCapitalizado =
        finiquitoPct > 0
          ? fv(tasaMensual, mesesHastaFiniquito, 0, -(precioContado * finiquitoPct))
          : 0;
      const totalReal = round2(enganche + pagoCapitalizado + finiquitoCapitalizado);

      const pagoCliente = round2(pagoPct * totalReal);
      const finiquitoCliente = round2(finiquitoPct * totalReal);

      return {
        ...baseResult,
        precioTotal: totalReal,
        descuentoEfectivoPct: precioLista > 0 ? 1 - totalReal / precioLista : 0,
        enganche,
        enganchePct,
        pagoIntermedio: pagoCliente,
        pagoIntermedioPct: pagoPct,
        fechaPagoIntermedio: fechaPago,
        finiquito: finiquitoCliente,
        finiquitoPct,
        fechaFiniquito,
        error,
      };
    }

    default:
      return baseResult;
  }
};

export const formatMonthYear = (date: Date): string => {
  return date.toLocaleDateString("es-MX", { month: "short", year: "numeric" });
};

export const formatPctShort = (value: number): string => {
  return `${(value * 100).toFixed(value * 100 >= 10 ? 0 : 1)}%`;
};
