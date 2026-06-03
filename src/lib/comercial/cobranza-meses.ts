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

export const formatMesCobranzaLabel = (isoDate: string) => {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  const year = date.getUTCFullYear() % 100;
  return `${MES_LABELS[date.getUTCMonth()]}-${String(year).padStart(2, "0")}`;
};
