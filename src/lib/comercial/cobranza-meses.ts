const MES_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Meses de cobranza del sembrado Pasaje (Abr-2024 → Abr-2028). */
export const generateSembradoCobranzaMeses = () => {
  const meses: string[] = [];
  let year = 2024;
  let month = 3;

  while (year < 2028 || (year === 2028 && month <= 3)) {
    meses.push(`${year}-${String(month + 1).padStart(2, "0")}-01`);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return meses;
};

export const SEMBRADO_COBRANZA_MESES = generateSembradoCobranzaMeses();

const toMonthStartIso = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;

const addUtcMonths = (date: Date, delta: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));

/**
 * Rango editable de cobranza: desde apartado (o hoy − 6 meses) hasta +36 meses,
 * unido a meses ya guardados en DB para no perder histórico.
 */
export const resolveCobranzaMeses = (input?: {
  fechaApartado?: string | null;
  existingMeses?: string[] | null;
  monthsBack?: number;
  monthsForward?: number;
}): string[] => {
  const monthsBack = input?.monthsBack ?? 6;
  const monthsForward = input?.monthsForward ?? 36;
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  let start = addUtcMonths(todayUtc, -monthsBack);
  if (input?.fechaApartado) {
    const apartado = new Date(`${input.fechaApartado.slice(0, 10)}T12:00:00.000Z`);
    if (!Number.isNaN(apartado.getTime())) {
      const apartadoStart = new Date(
        Date.UTC(apartado.getUTCFullYear(), apartado.getUTCMonth(), 1),
      );
      if (apartadoStart < start) {
        start = apartadoStart;
      }
    }
  }

  const end = addUtcMonths(todayUtc, monthsForward);
  const meses = new Set<string>();

  for (let cursor = start; cursor <= end; cursor = addUtcMonths(cursor, 1)) {
    meses.add(toMonthStartIso(cursor));
  }

  for (const raw of input?.existingMeses ?? []) {
    const key = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      meses.add(`${key.slice(0, 7)}-01`);
    }
  }

  return Array.from(meses).sort();
};

export const formatMesCobranzaLabel = (isoDate: string) => {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  const year = date.getUTCFullYear() % 100;
  return `${MES_LABELS[date.getUTCMonth()]}-${String(year).padStart(2, "0")}`;
};
