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
import { getInvesttiSimuladorConfigData } from "@/lib/corredor/investti-simulador-config-store";

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
  /** Fecha de pago (primer pago libre; subsecuentes día 15 o fin de mes). */
  fechaPago: Date;
  /** Fin de mes de la mensualidad */
  fechaVencimiento: Date;
  saldoInicial: number;
  interes: number;
  suma: number;
  aportacion: number;
  saldoFinal: number;
  /** enganche | mensualidad | aportacion | contado | sin-pago */
  tipo: "enganche" | "mensualidad" | "aportacion" | "contado" | "sin-pago";
  /** Desglose hoja «llenado amortización» (plan personalizado). */
  engancheParcial?: number;
  aportacionManual?: number;
  aportacionProgramada?: number;
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

function cfg() {
  return getInvesttiSimuladorConfigData();
}

function tasaMensualInvestti() {
  return cfg().interestAnual / 12;
}

/** Máximo descuento especial sin autorización del director comercial (Excel C31 / D31). */
export const INVESTTI_DESCUENTO_MAX_SIN_AUTORIZACION_PCT = 0.015;

/** Plazo máx. Infonavit / hipotecario — hoja Manzanas (columna Infonavit meses). */
export const INVESTTI_PLAZO_MAX_CREDITO_MESES = 6;

/** Liquidar todo el saldo en el último mes del plazo (mensualidad 0). */
export const INVESTTI_APORTACION_AL_FINAL = 0;

export type InvesttiTipoCompra = "recursos-propios" | "infonavit" | "hipotecario";

export const INVESTTI_TIPOS_COMPRA: readonly {
  id: InvesttiTipoCompra;
  label: string;
}[] = [
  { id: "recursos-propios", label: "Recursos propios" },
  { id: "infonavit", label: "Infonavit" },
  { id: "hipotecario", label: "Hipotecario" },
];

export function getInvesttiDesarrolloSlugs() {
  return cfg().desarrolloSlug;
}

export function getInvesttiSlugToExcel(): Record<string, string> {
  return cfg().slugDesarrollo;
}

/** @deprecated Usar getInvesttiSlugToExcel() cuando el config puede venir de runtime. */
export const INVESTTI_SLUG_TO_EXCEL = new Proxy({} as Record<string, string>, {
  get(_t, prop: string) {
    return cfg().slugDesarrollo[prop];
  },
  ownKeys() {
    return Reflect.ownKeys(cfg().slugDesarrollo);
  },
  getOwnPropertyDescriptor(_t, prop) {
    if (prop in cfg().slugDesarrollo) {
      return { enumerable: true, configurable: true, value: cfg().slugDesarrollo[String(prop)] };
    }
    return undefined;
  },
});

export function isInvesttiSimuladorDesarrollo(desarrolloId: string): boolean {
  return desarrolloId in cfg().reglas;
}

export function getInvesttiReglas(desarrolloId: string) {
  return cfg().reglas[desarrolloId];
}

export function getInvesttiEsquemasVenta() {
  return cfg().esquemas.filter((e) => e.id !== "libre");
}

export function labelInvesttiTipoCompra(tipoCompra: InvesttiTipoCompra): string {
  return INVESTTI_TIPOS_COMPRA.find((t) => t.id === tipoCompra)?.label ?? tipoCompra;
}

export function isInvesttiTipoCredito(tipoCompra: InvesttiTipoCompra): boolean {
  return tipoCompra === "infonavit" || tipoCompra === "hipotecario";
}

/** Excel I5 — enganche diferido máx. según tipo de compra (D18 / D19). */
export function getEngancheDiferidoMaxInvestti(tipoCompra: InvesttiTipoCompra): number {
  return isInvesttiTipoCredito(tipoCompra) ? 1 : 3;
}

/** Plazo máx. del plan personalizado según tipo de compra (D21 / reglas desarrollo). */
export function getPlazoMaxPlanInvestti(
  desarrolloId: string,
  tipoCompra: InvesttiTipoCompra,
): number {
  if (isInvesttiTipoCredito(tipoCompra)) {
    return INVESTTI_PLAZO_MAX_CREDITO_MESES;
  }
  return getInvesttiReglas(desarrolloId)?.plazoMaxMeses ?? 60;
}

/** Precio contado desde lista (descuento 8.99%). */
export function calcPrecioContado(precioLista: number): number {
  return roundMoney(precioLista * (1 - cfg().descuentosEsquemaPct.contado));
}

/** Convierte serial de fecha Excel (ej. 46054) a Date local. */
function excelSerialToDate(serial: number): Date {
  const utc = new Date((serial - 25569) * 86400 * 1000);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

/** Formatea entrega del lote — en Excel suele venir como serial numérico. */
export function formatInvesttiEntrega(entrega: string | null | undefined): string | null {
  if (!entrega?.trim()) return null;
  const trimmed = entrega.trim();
  if (/^\d{4,6}$/.test(trimmed)) {
    const serial = Number(trimmed);
    if (Number.isFinite(serial)) {
      return excelSerialToDate(serial).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }
  return trimmed;
}

const DIA_PAGO_DEFAULT = 15;

/** Día de los pagos después del primero (solo estas dos opciones). */
export type InvesttiDiaPagoSubsecuente = "dia-15" | "fin-mes";

export type InvesttiCalendarioPago = {
  fechaPrimerPago: Date;
  diaPagosSubsecuentes: InvesttiDiaPagoSubsecuente;
};

export function createCalendarioPagoDefault(fecha = new Date()): InvesttiCalendarioPago {
  return {
    fechaPrimerPago: new Date(fecha.getFullYear(), fecha.getMonth(), DIA_PAGO_DEFAULT),
    diaPagosSubsecuentes: "dia-15",
  };
}

export function toFechaPrimerPagoISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseFechaPrimerPagoISO(iso: string): Date | null {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
}

export function labelDiaPagosSubsecuentes(dia: InvesttiDiaPagoSubsecuente): string {
  return dia === "dia-15" ? "día 15 de cada mes" : "último día de cada mes";
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

function resolveCalendario(
  calendario?: InvesttiCalendarioPago,
  legacy?: { fechaBase?: Date },
): InvesttiCalendarioPago {
  if (calendario) return calendario;
  return createCalendarioPagoDefault(legacy?.fechaBase ?? new Date());
}

/** Fecha de pago: el primero es libre; los demás mes+offset con día 15 o fin de mes. */
export function fechaPagoEnCalendario(
  calendario: InvesttiCalendarioPago,
  offsetMeses: number,
): Date {
  if (offsetMeses === 0) {
    const fp = calendario.fechaPrimerPago;
    return new Date(fp.getFullYear(), fp.getMonth(), fp.getDate());
  }
  const base = calendario.fechaPrimerPago;
  const absMonth = base.getMonth() + offsetMeses;
  const year = base.getFullYear() + Math.floor(absMonth / 12);
  const month = absMonth % 12;
  if (calendario.diaPagosSubsecuentes === "fin-mes") {
    return endOfMonth(year, month);
  }
  return new Date(year, month, DIA_PAGO_DEFAULT);
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
  opts?: { calendario?: InvesttiCalendarioPago; fechaBase?: Date },
): InvesttiAmortizacionFila[] {
  const calendario = resolveCalendario(opts?.calendario, { fechaBase: opts?.fechaBase });

  if (esquema.id === "contado") {
    const fp = fechaPagoEnCalendario(calendario, 0);
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
      n === 1 ? precioContado : roundMoney(saldoFinalPrev * (1 + tasaMensualInvestti()));
    const interes = n === 1 ? 0 : roundMoney(saldoInicial * tasaMensualInvestti());
    const suma = roundMoney(saldoInicial + interes);
    let aportacion = esEnganche ? esquema.engancheMensual : esquema.mensualidad;
    if (n === totalFilas) {
      aportacion = suma;
    }
    aportacion = capPagoTotal(suma, aportacion);
    const saldoFinal = roundMoney(Math.max(0, suma - aportacion));
    const fp = fechaPagoEnCalendario(calendario, n - 1);

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
  opts?: { plazoMeses?: number; calendario?: InvesttiCalendarioPago; fechaBase?: Date },
): InvesttiEsquemaResult {
  const esquemaCfg = cfg().esquemas.find((e) => e.id === esquemaId);
  if (!esquemaCfg) {
    throw new Error(`Esquema desconocido: ${esquemaId}`);
  }

  const plazoMeses =
    esquemaId === "libre" ? (opts?.plazoMeses ?? esquemaCfg.plazoMeses) : esquemaCfg.plazoMeses;
  const enganchePct = esquemaCfg.enganchePct;
  const engancheDiferido = esquemaCfg.engancheDiferidoMeses;
  const calendario = resolveCalendario(opts?.calendario, { fechaBase: opts?.fechaBase });
  const fechaBase = calendario.fechaPrimerPago;

  if (esquemaId === "contado") {
    const total = precioContado;
    const base = {
      id: esquemaId,
      label: esquemaCfg.label,
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
        calendario,
      }),
    };
  }

  const engancheTotal = roundMoney(precioContado * enganchePct);
  const saldo = roundMoney(precioContado - engancheTotal);
  const saldoCapitalizado = roundMoney(
    fv(tasaMensualInvestti(), engancheDiferido, 0, -saldo, 0),
  );
  const mensualidad = roundMoney(pmt(tasaMensualInvestti(), plazoMeses, -saldoCapitalizado, 0, 0));
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
    label: esquemaCfg.label,
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
    tablaAmortizacion: buildTablaAmortizacionInvestti(precioContado, base, { calendario }),
  };
}

export function simularLoteInvestti(
  lote: InvesttiLoteRecord,
  opts?: {
    plazoLibreMeses?: number;
    calendario?: InvesttiCalendarioPago;
    fechaBase?: Date;
  },
): InvesttiSimulacionLote {
  const precioLista = lote.precioLista;
  const precioContado = lote.contado ?? calcPrecioContado(precioLista);

  const schemeIds = cfg().esquemas.map((e) => e.id as InvesttiEsquemaId);
  const esquemasResult = schemeIds.map((id) => {
    const r = simularEsquemaInvestti(precioLista, precioContado, id, {
      plazoMeses: id === "libre" ? opts?.plazoLibreMeses : undefined,
      calendario: opts?.calendario,
      fechaBase: opts?.fechaBase,
    });
    return {
      ...r,
      precioM2: roundMoney(r.total / lote.superficie),
    };
  });

  return { lote, precioLista, precioContado, esquemas: esquemasResult };
}

/** Parámetros editables — hoja «llenado amortización» del Excel Investti. */
export type InvesttiPlanPersonalizadoInput = {
  precioContado: number;
  enganchePct: number;
  engancheDiferidoMeses: number;
  plazoMeses: number;
  /** 1 = mensual, 6 = semestral, etc. */
  aportacionCadaMeses: number;
  /** 0 = calcular automáticamente (aportación deseada). */
  mensualidadDeseada?: number;
  /** Pago total (columna P) por mes G, cuando el asesor edita la tabla. */
  pagosEditados?: Record<number, number>;
  calendario?: InvesttiCalendarioPago;
  /** @deprecated Usar calendario */
  fechaBase?: Date;
  /** Excel I5 — Infonavit, Hipotecario o Recursos propios. */
  tipoCompra?: InvesttiTipoCompra;
};

export type InvesttiPlanPersonalizadoResult = {
  engancheTotal: number;
  engancheMensual: number;
  saldoFinanciar: number;
  /** Aportación extra periódica (sin mensualidad). */
  aportacionDeseada: number;
  /** Pago total en un mes de aportación — coincide con la columna «Pago total» de la tabla. */
  montoMesAportacion: number;
  mensualidadDeseada: number;
  totalPagado: number;
  totalInteres: number;
  errores: string[];
  advertencias: string[];
  tablaAmortizacion: InvesttiAmortizacionFila[];
};

/** Monto visible en la tabla para un mes con aportación periódica. */
export function resolveMontoMesAportacion(
  filas: InvesttiAmortizacionFila[],
  aportacionDeseada: number,
): number {
  const filaAport = filas.find((f) => (f.aportacionProgramada ?? 0) > 0.01);
  if (filaAport) {
    return filaAport.aportacion;
  }
  const filaTipoAport = filas.find((f) => f.tipo === "aportacion");
  if (filaTipoAport) {
    return filaTipoAport.aportacion;
  }
  return aportacionDeseada;
}

/** Vista «Para Imprimir» — solo pagos visibles al prospecto (sin saldos ni intereses). */
export type InvesttiFilaProspecto = {
  numero: number;
  /** Mes calendario original (para edición interna del asesor). */
  mesCalendario: number;
  fechaPago: Date;
  pagoTotal: number;
  apartado?: number;
  tipo: InvesttiAmortizacionFila["tipo"];
};

export type InvesttiResumenDescuento = {
  /** Fracción 0–1 (0.02 = 2%). */
  descuentoPct: number;
  totalSinDescuento: number;
  totalConDescuento: number;
  totalEnganche: number;
  totalMensAport: number;
  factorMensAport: number;
  requiereAutorizacion: boolean;
};

function engancheDeFila(fila: InvesttiAmortizacionFila): number {
  if (fila.engancheParcial !== undefined) {
    return fila.engancheParcial;
  }
  if (fila.tipo === "enganche") {
    return fila.aportacion;
  }
  return 0;
}

function mensualidadAportacionDeFila(fila: InvesttiAmortizacionFila): number {
  const eng = engancheDeFila(fila);
  return roundMoney(Math.max(0, fila.aportacion - eng));
}

/**
 * Reparte el descuento sobre mensualidades y aportaciones (columnas N+O del Excel).
 * El enganche (columna M) no se descuenta — réplica V8/V9 y columna W.
 */
export function calcResumenDescuentoInvestti(
  filas: InvesttiAmortizacionFila[],
  descuentoPct: number,
): InvesttiResumenDescuento {
  let totalEnganche = 0;
  let totalMensAport = 0;

  for (const fila of filas) {
    totalEnganche += engancheDeFila(fila);
    totalMensAport += mensualidadAportacionDeFila(fila);
  }

  totalEnganche = roundMoney(totalEnganche);
  totalMensAport = roundMoney(totalMensAport);
  const totalSinDescuento = roundMoney(totalEnganche + totalMensAport);

  if (descuentoPct <= 0) {
    return {
      descuentoPct: 0,
      totalSinDescuento,
      totalConDescuento: totalSinDescuento,
      totalEnganche,
      totalMensAport,
      factorMensAport: 1,
      requiereAutorizacion: false,
    };
  }

  const totalConDescuento = roundMoney(totalSinDescuento * (1 - descuentoPct));
  const poolConDescuento = roundMoney(totalConDescuento - totalEnganche);
  const factorMensAport = totalMensAport > 0 ? poolConDescuento / totalMensAport : 1;

  return {
    descuentoPct,
    totalSinDescuento,
    totalConDescuento,
    totalEnganche,
    totalMensAport,
    factorMensAport,
    requiereAutorizacion:
      descuentoPct > INVESTTI_DESCUENTO_MAX_SIN_AUTORIZACION_PCT + 1e-9,
  };
}

/** Pago visible al prospecto con descuento (columna W / «Para Imprimir»). */
export function pagoConDescuentoInvestti(
  fila: InvesttiAmortizacionFila,
  factorMensAport: number,
): number {
  if (fila.tipo === "contado") {
    return fila.aportacion;
  }

  const eng = engancheDeFila(fila);
  const mensAport = mensualidadAportacionDeFila(fila);

  if (eng > 0 && mensAport === 0) {
    return eng;
  }
  if (eng > 0) {
    return eng;
  }

  return roundMoney(mensAport * factorMensAport);
}

/** Convierte un pago editado en vista prospecto al monto del motor (columna P). */
export function pagoMotorDesdeProspecto(
  fila: InvesttiAmortizacionFila,
  pagoProspecto: number,
  factorMensAport: number,
): number {
  const eng = engancheDeFila(fila);
  const mensAport = mensualidadAportacionDeFila(fila);

  if (mensAport <= 0 || factorMensAport <= 0) {
    return roundMoney(pagoProspecto);
  }

  return roundMoney(eng + pagoProspecto / factorMensAport);
}

export function toFilasProspecto(
  filas: InvesttiAmortizacionFila[],
  apartado = 0,
  descuentoPct = 0,
): InvesttiFilaProspecto[] {
  const { factorMensAport } = calcResumenDescuentoInvestti(filas, descuentoPct);
  const conPago = filas.filter((f) => f.aportacion > 0);

  return conPago.map((fila, index) => ({
    numero: index + 1,
    mesCalendario: fila.numero,
    fechaPago: fila.fechaPago,
    pagoTotal:
      descuentoPct > 0
        ? pagoConDescuentoInvestti(fila, factorMensAport)
        : fila.aportacion,
    apartado: index === 0 && apartado > 0 && fila.tipo === "enganche" ? apartado : undefined,
    tipo: fila.tipo,
  }));
}

function capPagoTotal(suma: number, pago: number): number {
  return roundMoney(Math.min(Math.max(0, pago), suma));
}

/** Meses G con aportación programada (columna O del Excel). */
export function buildMesesPagoPlan(
  engancheDiferido: number,
  plazoMeses: number,
  aportacionCada: number,
): number[] {
  const fin = engancheDiferido + plazoMeses;
  if (aportacionCada === INVESTTI_APORTACION_AL_FINAL) {
    return fin > engancheDiferido ? [fin] : [];
  }

  const meses: number[] = [];
  const inicio = engancheDiferido + aportacionCada;
  for (let g = inicio; g <= fin; g += aportacionCada) {
    meses.push(g);
  }
  return meses;
}

type PlanPersonalizadoMotor = {
  precioContado: number;
  enganchePct: number;
  engancheDiferidoMeses: number;
  plazoMeses: number;
  aportacionCadaMeses: number;
  mensualidadDeseada: number;
  montoAportacion: number;
};

function saldoCapitalizadoPlan(motor: PlanPersonalizadoMotor): number {
  const engancheTotal = roundMoney(motor.precioContado * motor.enganchePct);
  const saldo = roundMoney(motor.precioContado - engancheTotal);
  return roundMoney(fv(tasaMensualInvestti(), motor.engancheDiferidoMeses, 0, -saldo, 0));
}

function resolverPagosMesPlan(input: {
  suma: number;
  engancheParcial: number;
  mensualidadDeseada: number;
  montoAportacion: number;
  esMesAportacion: boolean;
  esUltimoMes: boolean;
}): { aportacionManual: number; aportacionProgramada: number } {
  const {
    suma,
    engancheParcial,
    mensualidadDeseada,
    montoAportacion,
    esMesAportacion,
    esUltimoMes,
  } = input;

  let aportacionManual = 0;
  let aportacionProgramada = 0;

  if (mensualidadDeseada > 0) {
    aportacionManual = mensualidadDeseada;
  }

  if (!esMesAportacion) {
    return { aportacionManual, aportacionProgramada };
  }

  if (mensualidadDeseada <= 0 && esUltimoMes) {
    return {
      aportacionManual: 0,
      aportacionProgramada: roundMoney(Math.max(0, suma - engancheParcial)),
    };
  }

  if (mensualidadDeseada > 0 && montoAportacion > 0) {
    aportacionProgramada = montoAportacion;
  } else if (mensualidadDeseada <= 0 && montoAportacion > 0 && !esUltimoMes) {
    aportacionProgramada = montoAportacion;
  } else if (mensualidadDeseada <= 0 && montoAportacion > 0 && esUltimoMes) {
    return {
      aportacionManual: 0,
      aportacionProgramada: roundMoney(Math.max(0, suma - engancheParcial)),
    };
  }

  return { aportacionManual, aportacionProgramada };
}

/** Simula el plan y devuelve el saldo final (0 = cuadra). */
function saldoFinalPlanPersonalizado(motor: PlanPersonalizadoMotor): number {
  const {
    precioContado,
    enganchePct,
    engancheDiferidoMeses,
    plazoMeses,
    aportacionCadaMeses,
    mensualidadDeseada,
    montoAportacion,
  } = motor;

  const engancheTotal = roundMoney(precioContado * enganchePct);
  const engancheMensual =
    engancheDiferidoMeses > 0 ? roundMoney(engancheTotal / engancheDiferidoMeses) : engancheTotal;

  const mesesPagoSet = new Set(
    buildMesesPagoPlan(engancheDiferidoMeses, plazoMeses, aportacionCadaMeses),
  );
  const totalMeses = engancheDiferidoMeses + plazoMeses;
  const ultimoMesPago = totalMeses;

  let saldoPrev = 0;

  for (let g = 1; g <= totalMeses; g++) {
    const saldoInicial =
      g === 1
        ? precioContado
        : g === engancheDiferidoMeses + 1
          ? roundMoney(fv(tasaMensualInvestti(), engancheDiferidoMeses, 0, -saldoPrev, 0))
          : roundMoney(saldoPrev);

    const interes = g > engancheDiferidoMeses ? roundMoney(saldoInicial * tasaMensualInvestti()) : 0;
    const suma = roundMoney(saldoInicial + interes);
    const engancheParcial = g <= engancheDiferidoMeses ? engancheMensual : 0;

    const enFinanciamiento = g > engancheDiferidoMeses;
    const saldoAnteriorPositivo = g === 1 || saldoPrev > 0.5;

    let aportacionManual = 0;
    let aportacionProgramada = 0;

    if (enFinanciamiento && saldoAnteriorPositivo) {
      ({ aportacionManual, aportacionProgramada } = resolverPagosMesPlan({
        suma,
        engancheParcial,
        mensualidadDeseada,
        montoAportacion,
        esMesAportacion: mesesPagoSet.has(g),
        esUltimoMes: g === ultimoMesPago,
      }));
    }

    let pagoTotal = roundMoney(engancheParcial + aportacionManual + aportacionProgramada);
    pagoTotal = capPagoTotal(suma, pagoTotal);
    saldoPrev = roundMoney(Math.max(0, suma - pagoTotal));
  }

  return saldoPrev;
}

function calcAportacionConMensualidadFija(motor: PlanPersonalizadoMotor): number {
  const mesesPago = buildMesesPagoPlan(
    motor.engancheDiferidoMeses,
    motor.plazoMeses,
    motor.aportacionCadaMeses,
  );
  if (mesesPago.length === 0) {
    return 0;
  }

  if (mesesPago.length === 1) {
    return 0;
  }

  let lo = 0;
  let hi = saldoCapitalizadoPlan(motor);
  while (
    saldoFinalPlanPersonalizado({ ...motor, montoAportacion: hi }) > 0.01 &&
    hi < motor.precioContado
  ) {
    hi = roundMoney(hi * 1.5);
  }

  for (let i = 0; i < 96; i++) {
    const mid = roundMoney((lo + hi) / 2);
    const residual = saldoFinalPlanPersonalizado({ ...motor, montoAportacion: mid });
    if (residual > 0.01) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return roundMoney(hi);
}

export function calcAportacionDeseadaInvestti(
  precioContado: number,
  enganchePct: number,
  engancheDiferido: number,
  plazoMeses: number,
  aportacionCada: number,
  mensualidadDeseada = 0,
): number {
  const motor: PlanPersonalizadoMotor = {
    precioContado,
    enganchePct,
    engancheDiferidoMeses: engancheDiferido,
    plazoMeses,
    aportacionCadaMeses: aportacionCada,
    mensualidadDeseada,
    montoAportacion: 0,
  };

  if (mensualidadDeseada > 0) {
    if (aportacionCada === 1) {
      return 0;
    }
    return calcAportacionConMensualidadFija(motor);
  }

  const saldoCap = saldoCapitalizadoPlan(motor);
  const nPagos = buildMesesPagoPlan(engancheDiferido, plazoMeses, aportacionCada).length;
  if (nPagos <= 0) return 0;
  return roundMoney(pmt(tasaMensualInvestti(), nPagos, -saldoCap, 0, 0));
}

export function validarPlanPersonalizadoInvestti(
  desarrolloId: string,
  input: Pick<
    InvesttiPlanPersonalizadoInput,
    | "enganchePct"
    | "engancheDiferidoMeses"
    | "plazoMeses"
    | "aportacionCadaMeses"
    | "mensualidadDeseada"
    | "tipoCompra"
  > & { aportacionDeseada?: number },
): { errores: string[]; advertencias: string[] } {
  const reglas = getInvesttiReglas(desarrolloId);
  const errores: string[] = [];
  const advertencias: string[] = [];
  const tipoCompra = input.tipoCompra ?? "recursos-propios";

  if (!reglas) {
    errores.push("Desarrollo sin reglas de simulador.");
    return { errores, advertencias };
  }

  const engMin = reglas.engancheMinPct;
  if (input.enganchePct < engMin - 1e-9) {
    errores.push(`ERROR, ENG. MÍNIMO ${(engMin * 100).toFixed(1)}%`);
  }

  const engancheDiferidoMax = getEngancheDiferidoMaxInvestti(tipoCompra);
  if (input.engancheDiferidoMeses > engancheDiferidoMax) {
    errores.push(
      isInvesttiTipoCredito(tipoCompra)
        ? "ERROR, MÁXIMO 1 ENGANCHE"
        : "ERROR, MÁXIMO 3 MESES",
    );
  }

  const plazoMax = getPlazoMaxPlanInvestti(desarrolloId, tipoCompra);
  if (input.plazoMeses > plazoMax) {
    errores.push(`ERROR, MÁXIMO ${plazoMax} MESES`);
  }

  if (
    isInvesttiTipoCredito(tipoCompra) &&
    input.aportacionCadaMeses > INVESTTI_PLAZO_MAX_CREDITO_MESES
  ) {
    errores.push(`ERROR, MÁXIMO ${INVESTTI_PLAZO_MAX_CREDITO_MESES} MESES`);
  }

  const mensMin =
    "mensualidadMinima" in reglas
      ? (reglas as { mensualidadMinima: number }).mensualidadMinima
      : 0;
  const montoReferencia =
    (input.mensualidadDeseada ?? 0) > 0
      ? input.mensualidadDeseada!
      : (input.aportacionDeseada ?? 0);

  if ((input.mensualidadDeseada ?? 0) > 0 && input.mensualidadDeseada! < mensMin) {
    errores.push(
      `ERROR, MENS. MÍNIMA $${mensMin.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`,
    );
  } else if (input.aportacionCadaMeses === 1 && montoReferencia > 0 && montoReferencia < mensMin) {
    errores.push(
      `ERROR, MENS. MÍNIMA $${mensMin.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`,
    );
  }

  const mesesPago = buildMesesPagoPlan(
    input.engancheDiferidoMeses,
    input.plazoMeses,
    input.aportacionCadaMeses,
  );
  if (mesesPago.length === 0) {
    errores.push("El plazo no permite ningún pago con la periodicidad indicada.");
  }

  return { errores, advertencias };
}

/**
 * Tabla de amortización con pagos propuestos — réplica «llenado amortización».
 * Mes G: enganche en G≤deferido; aportaciones en G = deferido+cada, +2cada… hasta deferido+plazo.
 */
export function simularPlanPersonalizadoInvestti(
  desarrolloId: string,
  input: InvesttiPlanPersonalizadoInput,
): InvesttiPlanPersonalizadoResult {
  const {
    precioContado,
    enganchePct,
    engancheDiferidoMeses,
    plazoMeses,
    aportacionCadaMeses,
    mensualidadDeseada = 0,
    pagosEditados = {},
    calendario: calendarioInput,
    fechaBase,
  } = input;

  const calendario = resolveCalendario(calendarioInput, { fechaBase });

  const engancheTotal = roundMoney(precioContado * enganchePct);
  const engancheMensual =
    engancheDiferidoMeses > 0
      ? roundMoney(engancheTotal / engancheDiferidoMeses)
      : engancheTotal;
  const saldoFinanciar = roundMoney(precioContado - engancheTotal);
  const aportacionDeseada = calcAportacionDeseadaInvestti(
    precioContado,
    enganchePct,
    engancheDiferidoMeses,
    plazoMeses,
    aportacionCadaMeses,
    mensualidadDeseada,
  );

  const { errores, advertencias } = validarPlanPersonalizadoInvestti(desarrolloId, {
    enganchePct,
    engancheDiferidoMeses,
    plazoMeses,
    aportacionCadaMeses,
    mensualidadDeseada,
    aportacionDeseada,
    tipoCompra: input.tipoCompra,
  });

  const mesesPago = buildMesesPagoPlan(
    engancheDiferidoMeses,
    plazoMeses,
    aportacionCadaMeses,
  );
  const mesesPagoSet = new Set(mesesPago);
  const totalMeses = engancheDiferidoMeses + plazoMeses;
  const ultimoMesPago = totalMeses;
  const filas: InvesttiAmortizacionFila[] = [];
  let saldoPrev = 0;

  for (let g = 1; g <= totalMeses; g++) {
    const saldoInicial =
      g === 1
        ? precioContado
        : g === engancheDiferidoMeses + 1
          ? roundMoney(fv(tasaMensualInvestti(), engancheDiferidoMeses, 0, -saldoPrev, 0))
          : roundMoney(saldoPrev);

    const interes = g > engancheDiferidoMeses ? roundMoney(saldoInicial * tasaMensualInvestti()) : 0;
    const suma = roundMoney(saldoInicial + interes);
    const engancheParcial = g <= engancheDiferidoMeses ? engancheMensual : 0;

    let aportacionManual = 0;
    let aportacionProgramada = 0;

    const saldoAnteriorPositivo = g === 1 || saldoPrev > 0.5;

    const enFinanciamiento = g > engancheDiferidoMeses;

    if (pagosEditados[g] !== undefined && saldoAnteriorPositivo) {
      const pagoEditado = capPagoTotal(suma, pagosEditados[g]!);
      const resto = roundMoney(Math.max(0, pagoEditado - engancheParcial));
      aportacionProgramada = resto;
      aportacionManual = 0;
    } else if (enFinanciamiento && saldoAnteriorPositivo) {
      ({ aportacionManual, aportacionProgramada } = resolverPagosMesPlan({
        suma,
        engancheParcial,
        mensualidadDeseada,
        montoAportacion: aportacionDeseada,
        esMesAportacion: mesesPagoSet.has(g),
        esUltimoMes: g === ultimoMesPago,
      }));

      if (
        mensualidadDeseada > 0 &&
        aportacionDeseada <= 0 &&
        mesesPagoSet.has(g) &&
        mesesPago.length === 1
      ) {
        aportacionProgramada = roundMoney(
          Math.max(0, suma - engancheParcial - aportacionManual),
        );
      }
    }

    let pagoTotal = roundMoney(engancheParcial + aportacionManual + aportacionProgramada);
    pagoTotal = capPagoTotal(suma, pagoTotal);
    const saldoFinal = roundMoney(Math.max(0, suma - pagoTotal));

    const esEnganche = engancheParcial > 0 && aportacionManual + aportacionProgramada === 0;
    const tipo: InvesttiAmortizacionFila["tipo"] = esEnganche
      ? "enganche"
      : pagoTotal > 0
        ? aportacionProgramada > 0
          ? "aportacion"
          : "mensualidad"
        : "sin-pago";

    const fp = fechaPagoEnCalendario(calendario, g - 1);
    filas.push({
      numero: g,
      fechaPago: fp,
      fechaVencimiento: endOfMonth(fp.getFullYear(), fp.getMonth()),
      saldoInicial,
      interes,
      suma,
      aportacion: pagoTotal,
      saldoFinal,
      tipo,
      engancheParcial: engancheParcial || undefined,
      aportacionManual: aportacionManual || undefined,
      aportacionProgramada: aportacionProgramada || undefined,
    });

    saldoPrev = g === totalMeses ? 0 : saldoFinal;
  }

  const residualFinal = filas.at(-1)?.saldoFinal ?? 0;
  if (mensualidadDeseada > 0 && residualFinal > 0.01 && residualFinal < 500) {
    const filaAjuste = [...filas].reverse().find((f) => mesesPagoSet.has(f.numero));
    if (filaAjuste) {
      filaAjuste.aportacionProgramada = roundMoney(
        (filaAjuste.aportacionProgramada ?? 0) + residualFinal,
      );
      filaAjuste.aportacion = roundMoney(filaAjuste.aportacion + residualFinal);
      filaAjuste.saldoFinal = roundMoney(Math.max(0, filaAjuste.saldoFinal - residualFinal));
      if (filas.at(-1)) {
        filas.at(-1)!.saldoFinal = 0;
      }
    }
  }

  const totalPagado = roundMoney(filas.reduce((s, f) => s + f.aportacion, 0));
  const totalInteres = roundMoney(filas.reduce((s, f) => s + f.interes, 0));
  const saldoRemanente = filas.at(-1)?.saldoFinal ?? 0;

  if (errores.length === 0 && saldoRemanente > 0.01) {
    errores.push("ERROR, SALDO FINAL DEBE SER $0 PARA AUTORIZAR");
  }

  const montoMesAportacion = resolveMontoMesAportacion(filas, aportacionDeseada);

  return {
    engancheTotal,
    engancheMensual,
    saldoFinanciar,
    aportacionDeseada,
    montoMesAportacion,
    mensualidadDeseada,
    totalPagado,
    totalInteres,
    errores,
    advertencias,
    tablaAmortizacion: filas,
  };
}
