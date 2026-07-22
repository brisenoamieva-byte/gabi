/** Redondeo estándar de montos en pesos (2 decimales). */
export const roundMoney = (value: number): number =>
  Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

const mxnFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const mxnTicketFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const amountFormatter = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Precio con símbolo $ y 2 decimales (es-MX). */
export const formatPrice = (price: number): string =>
  mxnFormatter.format(roundMoney(price));

/** Ticket de lote sin decimales (es-MX). */
export const formatTicket = (value: number): string =>
  mxnTicketFormatter.format(Math.round(Number.isFinite(value) ? value : 0));

/** Dígitos con miles y 2 decimales, sin símbolo $ (inputs con prefijo visual). */
export const formatAmountDigits = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  return amountFormatter.format(roundMoney(value));
};

/** Monto con signo de pesos, separador de miles y 2 decimales (para inputs). */
export const formatAmountInput = (value: number): string => {
  const digits = formatAmountDigits(value);
  return digits ? `$${digits}` : "";
};

const normalizeMoneyDigits = (raw: string): string | null => {
  const trimmed = raw.trim().replace(/\$/g, "").replace(/\s/g, "");
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes(",") && trimmed.includes(".")) {
    return trimmed.replace(/,/g, "");
  }

  if (trimmed.includes(",")) {
    const [entero, decimales] = trimmed.split(",");
    if (decimales !== undefined && decimales.length <= 2) {
      return `${entero.replace(/\./g, "")}.${decimales}`;
    }
    return trimmed.replace(/,/g, "");
  }

  return trimmed;
};

/** Número con hasta 2 decimales (es-MX). */
export const formatDecimal = (value: number, maxDecimals = 2): string => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(roundMoney(value));
};

/** Superficie en m² con máximo 2 decimales. */
export const formatAreaM2 = (
  value: number | null | undefined,
  suffix = "m²",
): string => {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return "";
  }
  return `${formatDecimal(value)} ${suffix}`;
};

/** Interpreta captura con comas, puntos o símbolo de peso. */
export const parseMoneyInput = (raw: string): number | null => {
  const normalized = normalizeMoneyDigits(raw);
  if (normalized === null) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return roundMoney(parsed);
};
