export const XPERIENCE_CALIFICACIONES = [
  "Sin Calificar",
  "Activo / En Segumiento",
  "Activo / Interesado",
  "Activo / Visita",
  "Descartado / Datos Falsos",
  "Descartado / No le Interesa",
] as const;

export type XperienceCalificacion = (typeof XPERIENCE_CALIFICACIONES)[number];

export const calificacionEsSpam = (calificacion?: string | null) =>
  Boolean(calificacion?.trim().toLowerCase().startsWith("descartado"));

export const calificacionLabel = (calificacion?: string | null) =>
  calificacion?.trim() || "Sin Calificar";

export const calificacionColor = (calificacion?: string | null) => {
  const value = calificacion?.trim() ?? "";
  if (!value || value === "Sin Calificar") {
    return "bg-slate-100 text-slate-700";
  }
  if (value.startsWith("Activo")) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (value.startsWith("Descartado")) {
    return "bg-red-100 text-red-800";
  }
  return "bg-sky-100 text-sky-800";
};

export const scoreBadgeColor = (score: number | null | undefined) => {
  if (score == null) {
    return "bg-slate-200 text-slate-600";
  }
  if (score >= 25) {
    return "bg-red-600 text-white";
  }
  if (score >= 15) {
    return "bg-orange-500 text-white";
  }
  if (score >= 8) {
    return "bg-amber-400 text-amber-950";
  }
  return "bg-slate-300 text-slate-700";
};

export const canalIconKey = (canal?: string | null) => {
  const value = (canal ?? "").toLowerCase();
  if (value.includes("facebook")) {
    return "facebook";
  }
  if (value.includes("instagram")) {
    return "instagram";
  }
  if (value.includes("whatsapp") || value.includes("mensajes")) {
    return "whatsapp";
  }
  if (value.includes("tel") || value.includes("llamada")) {
    return "phone";
  }
  return "default";
};

export const normalizeLeadNombre = (nombre?: string | null) => {
  const value = nombre?.trim() ?? "";
  if (!value || value === "[Nombre por registrar]") {
    return "Nombre por registrar";
  }
  return value;
};
