export const PROSPECTO_ETAPAS = [
  "nuevo",
  "contactado",
  "cita",
  "apartado",
  "vendido",
  "cancelado",
  "perdido",
] as const;

export type ProspectoEtapa = (typeof PROSPECTO_ETAPAS)[number];

/** Etapas abiertas que el asesor debe atender (prioridad en bandeja). */
export const PROSPECTO_ETAPAS_EN_SEGUIMIENTO = [
  "nuevo",
  "contactado",
  "cita",
] as const satisfies readonly ProspectoEtapa[];

/** Sentinel de filtro de listado: solo etapas en seguimiento. */
export const PROSPECTO_ETAPA_FILTER_EN_SEGUIMIENTO = "en_seguimiento";

export const prospectoEtapaLabel: Record<ProspectoEtapa, string> = {
  nuevo: "Nuevo / Por Contactar",
  contactado: "Contactado",
  cita: "Cita",
  apartado: "Apartado",
  vendido: "Vendido",
  cancelado: "Cancelado",
  perdido: "Descartado",
};

export const prospectoEtapaColor: Record<ProspectoEtapa, string> = {
  nuevo: "bg-slate-100 text-slate-700",
  contactado: "bg-sky-100 text-sky-800",
  cita: "bg-violet-100 text-violet-800",
  apartado: "bg-emerald-100 text-emerald-800",
  vendido: "bg-gabi-forest/10 text-gabi-forest",
  cancelado: "bg-amber-100 text-amber-900",
  perdido: "bg-red-100 text-red-700",
};

export const prospectoEtapaDot: Record<ProspectoEtapa, string> = {
  nuevo: "bg-slate-400",
  contactado: "bg-sky-500",
  cita: "bg-violet-500",
  apartado: "bg-emerald-500",
  vendido: "bg-gabi-forest",
  cancelado: "bg-amber-500",
  perdido: "bg-red-500",
};

export const isProspectoEtapa = (value: string): value is ProspectoEtapa =>
  PROSPECTO_ETAPAS.includes(value as ProspectoEtapa);

/** Compatibilidad con registros legacy (cotizo, negociacion). */
export const normalizeProspectoEtapaValue = (value: string): ProspectoEtapa | null => {
  const normalized =
    value === "cotizo" || value === "negociacion" ? "cita" : value;
  return isProspectoEtapa(normalized) ? normalized : null;
};

const ETAPAS_BLOQUEADAS_VISITA = new Set<ProspectoEtapa>([
  "apartado",
  "vendido",
  "cancelado",
  "perdido",
]);

export const prospectoEtapaFromVisita = (
  tipo: "lead_registrado" | "recorrido_completado",
): ProspectoEtapa => (tipo === "recorrido_completado" ? "cita" : "nuevo");

/** Avanza etapa sin retroceder ni mover apartado/vendido/cancelado/perdido. */
export const mergeProspectoEtapa = (
  current: string,
  target: ProspectoEtapa,
): ProspectoEtapa => {
  const currentEtapa = normalizeProspectoEtapaValue(current);
  if (currentEtapa && ETAPAS_BLOQUEADAS_VISITA.has(currentEtapa)) {
    return currentEtapa;
  }

  const currentIndex = currentEtapa ? PROSPECTO_ETAPAS.indexOf(currentEtapa) : -1;
  const targetIndex = PROSPECTO_ETAPAS.indexOf(target);

  if (currentIndex < 0) {
    return target;
  }

  return PROSPECTO_ETAPAS[Math.max(currentIndex, targetIndex)];
};

/** Avanza etapa por visita sin retroceder ni mover etapas cerradas. */
export const mergeProspectoEtapaFromVisita = (
  current: string,
  tipo: "lead_registrado" | "recorrido_completado",
): ProspectoEtapa => mergeProspectoEtapa(current, prospectoEtapaFromVisita(tipo));

const ESTATUS_SEMBRADO_APARTADO = new Set([
  "Apartado",
  "Vendido Cobrado 1er Parte",
  "Vendidas listas para cobro",
  "Vendidas en espera de cobro",
]);

/** Mapea estatus de sembrado a etapa CRM del prospecto. */
export const prospectoEtapaFromSembrado = (
  estatusSembrado: string,
  cancelada = false,
): ProspectoEtapa | null => {
  if (cancelada) {
    return "cancelado";
  }

  const estatus = estatusSembrado.trim();
  if (estatus === "Vendidas Cobradas" || estatus === "Vendidas Desarrollador") {
    return "vendido";
  }
  if (ESTATUS_SEMBRADO_APARTADO.has(estatus)) {
    return "apartado";
  }

  return null;
};
