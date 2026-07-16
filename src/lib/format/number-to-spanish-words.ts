/**
 * Convierte montos a letra (es-MX) para documentos legales.
 * Ejemplo: 3228030 → "Tres millones doscientos veintiocho mil treinta pesos 00/100 M.N."
 */

const UNIDADES = [
  "",
  "un",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
];

const DECENAS = [
  "",
  "diez",
  "veinte",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];

const CENTENAS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const underThousand = (n: number): string => {
  if (n === 0) return "";
  if (n === 100) return "cien";
  if (n < 20) return UNIDADES[n];

  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (d === 2 && u > 0) {
      return `veinti${UNIDADES[u]}`;
    }
    return u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${UNIDADES[u]}`;
  }

  const c = Math.floor(n / 100);
  const rest = n % 100;
  const head = CENTENAS[c];
  return rest === 0 ? head : `${head} ${underThousand(rest)}`;
};

const underMillion = (n: number): string => {
  if (n < 1000) return underThousand(n);
  const miles = Math.floor(n / 1000);
  const rest = n % 1000;
  let head: string;
  if (miles === 1) {
    head = "mil";
  } else {
    head = `${underThousand(miles)} mil`;
  }
  return rest === 0 ? head : `${head} ${underThousand(rest)}`;
};

const integerToWords = (n: number): string => {
  if (n === 0) return "cero";
  if (n < 1_000_000) return underMillion(n);

  const millones = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  const head =
    millones === 1 ? "un millón" : `${underMillion(millones)} millones`;
  return rest === 0 ? head : `${head} ${underMillion(rest)}`;
};

/** Monto en letra con centavos /100 M.N. */
export const moneyToSpanishWords = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }
  const abs = Math.abs(value);
  const pesos = Math.floor(abs + 1e-9);
  const cents = Math.round((abs - pesos) * 100);
  const centavos = String(Math.min(99, Math.max(0, cents))).padStart(2, "0");
  const words = integerToWords(pesos);
  const phrase = `${words} pesos ${centavos}/100 M.N.`;
  return capitalize(phrase);
};
