export const PROSPECTO_ETAPAS = [
  "nuevo",
  "contactado",
  "cotizo",
  "negociacion",
  "apartado",
  "vendido",
  "perdido",
] as const;

export type ProspectoEtapa = (typeof PROSPECTO_ETAPAS)[number];

export const prospectoEtapaLabel: Record<ProspectoEtapa, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  cotizo: "Cotizó",
  negociacion: "Negociación",
  apartado: "Apartado",
  vendido: "Vendido",
  perdido: "Perdido",
};

export const prospectoEtapaColor: Record<ProspectoEtapa, string> = {
  nuevo: "bg-slate-100 text-slate-700",
  contactado: "bg-sky-100 text-sky-800",
  cotizo: "bg-violet-100 text-violet-800",
  negociacion: "bg-amber-100 text-amber-800",
  apartado: "bg-emerald-100 text-emerald-800",
  vendido: "bg-gabi-forest/10 text-gabi-forest",
  perdido: "bg-red-100 text-red-700",
};

export const prospectoEtapaDot: Record<ProspectoEtapa, string> = {
  nuevo: "bg-slate-400",
  contactado: "bg-sky-500",
  cotizo: "bg-violet-500",
  negociacion: "bg-amber-500",
  apartado: "bg-emerald-500",
  vendido: "bg-gabi-forest",
  perdido: "bg-red-500",
};

export const isProspectoEtapa = (value: string): value is ProspectoEtapa =>
  PROSPECTO_ETAPAS.includes(value as ProspectoEtapa);

const ETAPAS_BLOQUEADAS_VISITA = new Set<ProspectoEtapa>(["apartado", "vendido", "perdido"]);

export const prospectoEtapaFromVisita = (
  tipo: "lead_registrado" | "recorrido_completado",
): ProspectoEtapa => (tipo === "recorrido_completado" ? "contactado" : "nuevo");

/** Avanza etapa sin retroceder ni mover apartado/vendido/perdido. */
export const mergeProspectoEtapa = (
  current: string,
  target: ProspectoEtapa,
): ProspectoEtapa => {
  if (isProspectoEtapa(current) && ETAPAS_BLOQUEADAS_VISITA.has(current)) {
    return current;
  }

  const currentIndex = isProspectoEtapa(current) ? PROSPECTO_ETAPAS.indexOf(current) : -1;
  const targetIndex = PROSPECTO_ETAPAS.indexOf(target);

  if (currentIndex < 0) {
    return target;
  }

  return PROSPECTO_ETAPAS[Math.max(currentIndex, targetIndex)];
};

/** Avanza etapa por visita sin retroceder ni mover apartado/vendido/perdido. */
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
    return "perdido";
  }

  const estatus = estatusSembrado.trim();
  if (estatus === "Vendidas Cobradas") {
    return "vendido";
  }
  if (ESTATUS_SEMBRADO_APARTADO.has(estatus)) {
    return "apartado";
  }

  return null;
};
