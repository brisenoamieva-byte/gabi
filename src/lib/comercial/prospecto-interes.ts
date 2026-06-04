export const NIVELES_INTERES = ["sin_interes", "bajo", "alto"] as const;

export type NivelInteres = (typeof NIVELES_INTERES)[number];

export const nivelInteresLabel: Record<NivelInteres, string> = {
  sin_interes: "Sin interés",
  bajo: "Bajo",
  alto: "Alto",
};

export const nivelInteresColor: Record<NivelInteres, string> = {
  sin_interes: "bg-slate-100 text-slate-700",
  bajo: "bg-amber-100 text-amber-900",
  alto: "bg-emerald-100 text-emerald-800",
};

export const isNivelInteres = (value: string): value is NivelInteres =>
  NIVELES_INTERES.includes(value as NivelInteres);

export const nivelInteresLabelOrDefault = (value?: string | null) => {
  if (value && isNivelInteres(value)) {
    return nivelInteresLabel[value];
  }
  return "Sin definir";
};

export const nivelInteresColorOrDefault = (value?: string | null) => {
  if (value && isNivelInteres(value)) {
    return nivelInteresColor[value];
  }
  return "bg-slate-50 text-slate-500";
};

/** Mapea etiquetas libres (Parseur / Xperience) al valor GABI. */
export const nivelInteresFromLabel = (label: string): NivelInteres | null => {
  const normalized = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized.includes("alto") || normalized.includes("high")) {
    return "alto";
  }
  if (normalized.includes("bajo") || normalized.includes("low")) {
    return "bajo";
  }
  if (normalized.includes("sin interes") || normalized.includes("sin_interes")) {
    return "sin_interes";
  }

  return null;
};
