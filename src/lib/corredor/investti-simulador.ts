/**
 * Simulador financiero Grupo Investti (terrenos).
 * Replica la lógica del Excel "Simulador Master Investti 4feb25 (25).xlsm".
 *
 * Base: precio CONTADO = lista × (1 − 8.99%).
 * Enganche y mensualidades se calculan sobre precio contado.
 * Interés: 12% anual (llenado amortización · celda C1).
 */

import { fv, pmt } from "@/lib/cotizador/pasaje-simulador";
import { roundMoney } from "@/lib/format/money";
import { INVESTTI_SIMULADOR_CONFIG } from "@/lib/corredor/investti-simulador-config.generated";

export type InvesttiEsquemaId =
  | "contado"
  | "m6"
  | "m12"
  | "m18"
  | "m24"
  | "m36"
  | "m48"
  | "m60"
  | "m72"
  | "libre";

export type InvesttiLoteRecord = {
  desarrollo: string;
  manzana: string;
  lote: string;
  key: string;
  superficie: number;
  tipo: string;
  precioM2: number;
  precioLista: number;
  contado: number | null;
  entrega: string | null;
};

export type InvesttiAmortizacionFila = {
  numero: number;
  /** Fecha de pago (día 15 del mes) */
  fechaPago: Date;
  /** Fin de mes de la mensualidad */
  fechaVencimiento: Date;
  saldoInicial: number;
  interes: number;
  suma: number;
  aportacion: number;
  saldoFinal: number;
  /** enganche | mensualidad | contado */
  tipo: "enganche" | "mensualidad" | "contado";
};

export type InvesttiEsquemaResult = {
  id: InvesttiEsquemaId;
  label: string;
  /** Descuento (+) o prima (−) vs precio lista */
  descuentoVsListaPct: number;
  total: number;
  enganchePct: number;
  engancheTotal: number;
  engancheDiferidoMeses: number;
  engancheMensual: number;
  plazoMeses: number;
  mensualidad: number;
  precioM2: number;
  descripcionPago: string;
  tablaAmortizacion: InvesttiAmortizacionFila[];
};

export type InvesttiSimulacionLote = {
  lote: InvesttiLoteRecord;
  precioLista: number;
  precioContado: number;
  esquemas: InvesttiEsquemaResult[];
};

const { interestAnual, esquemas, descuentosEsquemaPct } = INVESTTI_SIMULADOR_CONFIG;
const TASA_MENSUAL = interestAnual / 12;

export const INVESTTI_DESARROLLO_SLUGS = INVESTTI_SIMULADOR_CONFIG.desarrolloSlug;
export const INVESTTI_SLUG_TO_EXCEL = INVESTTI_SIMULADOR_CONFIG.slugDesarrollo as Record<
  string,
  string
>;

export function isInvesttiSimuladorDesarrollo(desarrolloId: string): boolean {
  return desarrolloId in INVESTTI_SIMULADOR_CONFIG.reglas;
}

export function getInvesttiReglas(desarrolloId: string) {
  return INVESTTI_SIMULADOR_CONFIG.reglas[
    desarrolloId as keyof typeof INVESTTI_SIMULADOR_CONFIG.reglas
  ];
}

/** Precio contado desde lista (descuento 8.99%). */
export function calcPrecioContado(precioLista: number): number {
  return roundMoney(precioLista * (1 - descuentosEsquemaPct.contado));
}

const DIA_PAGO_DEFAULT = 15;

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

function fechaPagoMes(fechaBase: Date, offsetMeses: number, diaPago = DIA_PAGO_DEFAULT): Date {
  const d = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + offsetMeses, diaPago);
  return d;
}

/** Tabla de amortización — réplica hoja «llenado amortización» del Excel Investti. */
export function buildTablaAmortizacionInvestti(
  precioContado: number,
  esquema: Pick<
    InvesttiEsquemaResult,
    | "id"
    | "engancheDiferidoMeses"
    | "engancheMensual"
    | "engancheTotal"
    | "plazoMeses"
    | "mensualidad"
  >,
  opts?: { fechaBase?: Date; diaPago?: number },
): InvesttiAmortizacionFila[] {
  const fechaBase = opts?.fechaBase ?? new Date();
  const diaPago = opts?.diaPago ?? DIA_PAGO_DEFAULT;

  if (esquema.id === "contado") {
    const fp = fechaPagoMes(fechaBase, 0, diaPago);
    return [
      {
        numero: 1,
        fechaPago: fp,
        fechaVencimiento: endOfMonth(fp.getFullYear(), fp.getMonth()),
        saldoInicial: precioContado,
        interes: 0,
        suma: precioContado,
        aportacion: precioContado,
        saldoFinal: 0,
        tipo: "contado",
      },
    ];
  }

  const engancheMeses = esquema.engancheDiferidoMeses;
  const plazo = esquema.plazoMeses;
  const totalFilas = engancheMeses + plazo;
  const filas: InvesttiAmortizacionFila[] = [];
  let saldoFinalPrev = 0;

  for (let n = 1; n <= totalFilas; n++) {
    const esEnganche = n <= engancheMeses;
    const saldoInicial =
      n === 1 ? precioContado : roundMoney(saldoFinalPrev * (1 + TASA_MENSUAL));
    const interes = n === 1 ? 0 : roundMoney(saldoInicial * TASA_MENSUAL);
    const suma = roundMoney(saldoInicial + interes);
    const aportacion = esEnganche ? esquema.engancheMensual : esquema.mensualidad;
    const saldoFinal = roundMoney(suma - aportacion);
    const fp = fechaPagoMes(fechaBase, n - 1, diaPago);

    filas.push({
      numero: n,
      fechaPago: fp,
      fechaVencimiento: endOfMonth(fp.getFullYear(), fp.getMonth()),
      saldoInicial,
      interes,
      suma,
      aportacion,
      saldoFinal: n === totalFilas ? 0 : saldoFinal,
      tipo: esEnganche ? "enganche" : "mensualidad",
    });
    saldoFinalPrev = n === totalFilas ? 0 : saldoFinal;
  }

  return filas;
}

function formatMesesRango(inicioOffset: number, finOffset: number, fechaBase = new Date()): string {
  const fmt = (offset: number) => {
    const d = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + offset, 1);
    return d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }).replace(".", "");
  };
  return `de ${fmt(inicioOffset)} a ${fmt(finOffset)}`;
}

export function simularEsquemaInvestti(
  precioLista: number,
  precioContado: number,
  esquemaId: InvesttiEsquemaId,
  opts?: { plazoMeses?: number; fechaBase?: Date },
): InvesttiEsquemaResult {
  const cfg = esquemas.find((e) => e.id === esquemaId);
  if (!cfg) {
    throw new Error(`Esquema desconocido: ${esquemaId}`);
  }

  const plazoMeses =
    esquemaId === "libre" ? (opts?.plazoMeses ?? cfg.plazoMeses) : cfg.plazoMeses;
  const enganchePct = cfg.enganchePct;
  const engancheDiferido = cfg.engancheDiferidoMeses;
  const fechaBase = opts?.fechaBase ?? new Date();

  if (esquemaId === "contado") {
    const total = precioContado;
    const base = {
      id: esquemaId,
      label: cfg.label,
      descuentoVsListaPct: roundMoney((1 - total / precioLista) * 10000) / 100,
      total,
      enganchePct: 1,
      engancheTotal: total,
      engancheDiferidoMeses: 0,
      engancheMensual: total,
      plazoMeses: 0,
      mensualidad: 0,
      precioM2: 0,
      descripcionPago: "100% al firmar",
    };
    return {
      ...base,
      tablaAmortizacion: buildTablaAmortizacionInvestti(precioContado, base, {
        fechaBase,
      }),
    };
  }

  const engancheTotal = roundMoney(precioContado * enganchePct);
  const saldo = roundMoney(precioContado - engancheTotal);
  const saldoCapitalizado = roundMoney(
    fv(TASA_MENSUAL, engancheDiferido, 0, -saldo, 0),
  );
  const mensualidad = roundMoney(pmt(TASA_MENSUAL, plazoMeses, -saldoCapitalizado, 0, 0));
  const total = roundMoney(engancheTotal + plazoMeses * mensualidad);
  const engancheMensual =
    engancheDiferido > 0 ? roundMoney(engancheTotal / engancheDiferido) : engancheTotal;

  const engancheLabel =
    engancheDiferido <= 1
      ? `1 mensualidad de ${engancheMensual.toLocaleString("es-MX", { style: "currency", currency: "MXN" })} ${formatMesesRango(1, 1, fechaBase)}`
      : `${engancheDiferido} mensualidades de ${engancheMensual.toLocaleString("es-MX", { style: "currency", currency: "MXN" })} ${formatMesesRango(1, engancheDiferido, fechaBase)}`;

  const mensualidadesLabel = `${plazoMeses} mensualidades de ${mensualidad.toLocaleString("es-MX", { style: "currency", currency: "MXN" })} ${formatMesesRango(engancheDiferido + 1, engancheDiferido + plazoMeses, fechaBase)}`;

  const base = {
    id: esquemaId,
    label: cfg.label,
    descuentoVsListaPct: roundMoney((1 - total / precioLista) * 10000) / 100,
    total,
    enganchePct,
    engancheTotal,
    engancheDiferidoMeses: engancheDiferido,
    engancheMensual,
    plazoMeses,
    mensualidad,
    precioM2: roundMoney(total / (precioLista > 0 ? precioLista : 1)),
    descripcionPago: `${Math.round(enganchePct * 100)}% enganche en ${engancheLabel}, más ${mensualidadesLabel}`,
  };
  return {
    ...base,
    tablaAmortizacion: buildTablaAmortizacionInvestti(precioContado, base, { fechaBase }),
  };
}

export function simularLoteInvestti(
  lote: InvesttiLoteRecord,
  opts?: { plazoLibreMeses?: number; fechaBase?: Date },
): InvesttiSimulacionLote {
  const precioLista = lote.precioLista;
  const precioContado = lote.contado ?? calcPrecioContado(precioLista);

  const schemeIds = esquemas.map((e) => e.id as InvesttiEsquemaId);
  const esquemasResult = schemeIds.map((id) => {
    const r = simularEsquemaInvestti(precioLista, precioContado, id, {
      plazoMeses: id === "libre" ? opts?.plazoLibreMeses : undefined,
      fechaBase: opts?.fechaBase,
    });
    return {
      ...r,
      precioM2: roundMoney(r.total / lote.superficie),
    };
  });

  return { lote, precioLista, precioContado, esquemas: esquemasResult };
}

export const INVESTTI_ESQUEMAS_VENTA = esquemas.filter((e) => e.id !== "libre");
