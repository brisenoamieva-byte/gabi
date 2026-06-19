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

/** Códigos visuales al estilo Xperience (prefijo numérico en calificación). */
export const calificacionCodigo = (calificacion?: string | null): number => {
  const value = calificacion?.trim() ?? "";
  if (!value || value === "Sin Calificar") {
    return 0;
  }
  if (value.includes("En Segu") || value.includes("Segumiento")) {
    return 8;
  }
  if (value.includes("Interesado")) {
    return 15;
  }
  if (value.includes("Visita")) {
    return 12;
  }
  if (value.startsWith("Descartado")) {
    return 1;
  }
  return 0;
};

export const calificacionDisplayLabel = (calificacion?: string | null) => {
  const label = calificacionLabel(calificacion);
  const code = calificacionCodigo(calificacion);
  return `${code} - ${label}`;
};

export type TipoAsignacion = "directa" | "rol_producto" | "duplicado" | "otro";

export const parseTipoAsignacion = (asignadoPor?: string | null): TipoAsignacion => {
  const value = (asignadoPor ?? "").trim().toLowerCase();
  if (!value) {
    return "otro";
  }
  if (value.includes("duplicado")) {
    return "duplicado";
  }
  if (value.includes("rol") && value.includes("producto")) {
    return "rol_producto";
  }
  if (value.includes("directa") || value.includes("directo")) {
    return "directa";
  }
  return "otro";
};

export const tipoAsignacionLabel = (asignadoPor?: string | null) => {
  const tipo = parseTipoAsignacion(asignadoPor);
  if (tipo === "directa") {
    return "Asignación directa";
  }
  if (tipo === "rol_producto") {
    return "Rol de producto";
  }
  if (tipo === "duplicado") {
    return "Duplicado";
  }
  return asignadoPor?.trim() || "—";
};

export const tipoAsignacionBadgeClass = (asignadoPor?: string | null) => {
  const tipo = parseTipoAsignacion(asignadoPor);
  if (tipo === "directa" || tipo === "rol_producto") {
    return "bg-sky-100 text-sky-800";
  }
  if (tipo === "duplicado") {
    return "bg-amber-100 text-amber-900";
  }
  return "bg-slate-100 text-slate-600";
};

export const formatLeadsDateRangeLabel = (desde?: string, hasta?: string) => {
  if (!desde && !hasta) {
    return "Todas las fechas";
  }
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  if (desde && hasta) {
    return `${fmt(desde)} al ${fmt(hasta)}`;
  }
  if (desde) {
    return `Desde ${fmt(desde)}`;
  }
  return `Hasta ${fmt(hasta!)}`;
};
