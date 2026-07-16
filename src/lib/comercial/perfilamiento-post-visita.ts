export type PerfilamientoVisitaAnswers = {
  presupuestoDisponible: boolean;
  intencionApartarInmediato: boolean;
  decisorVisita: boolean;
  vioPublicidadRedes: boolean;
};

export type PerfilamientoVisitaRecord = {
  presupuestoDisponible: boolean | null;
  intencionApartarInmediato: boolean | null;
  decisorVisita: boolean | null;
  vioPublicidadRedes: boolean | null;
};

export const PERFILAMIENTO_VISITA_QUESTIONS: Array<{
  key: keyof PerfilamientoVisitaAnswers;
  /** Texto completo (accesibilidad / tooltips). */
  label: string;
  /** Etiqueta corta para UI compacta. */
  shortLabel: string;
}> = [
  {
    key: "presupuestoDisponible",
    label:
      "¿El prospecto tiene el presupuesto necesario y disponible para comprar en el desarrollo?",
    shortLabel: "Presupuesto disponible",
  },
  {
    key: "intencionApartarInmediato",
    label: "¿El prospecto tiene intención de apartar de inmediato?",
    shortLabel: "Intención de apartar",
  },
  {
    key: "decisorVisita",
    label:
      "¿El prospecto con el que hablas es quien tomará la decisión final de comprar?",
    shortLabel: "Es el decisor",
  },
  {
    key: "vioPublicidadRedes",
    label:
      "Independientemente del medio de contacto, ¿el prospecto ha visto publicidad del desarrollo en redes sociales?",
    shortLabel: "Vio publicidad en redes",
  },
];

export const PLAYBOOK_PERFILAMIENTO_VISITA_STEP_IDS = new Set([
  "necesidades-perfiladas",
  "necesidades",
]);

export const readPerfilamientoVisitaFromProspecto = (row: {
  perfil_presupuesto_disponible?: boolean | null;
  perfil_intencion_apartar?: boolean | null;
  perfil_decisor_visita?: boolean | null;
  perfil_vio_publicidad_redes?: boolean | null;
}): PerfilamientoVisitaRecord => ({
  presupuestoDisponible: row.perfil_presupuesto_disponible ?? null,
  intencionApartarInmediato: row.perfil_intencion_apartar ?? null,
  decisorVisita: row.perfil_decisor_visita ?? null,
  vioPublicidadRedes: row.perfil_vio_publicidad_redes ?? null,
});

export const isPerfilamientoVisitaComplete = (
  record: PerfilamientoVisitaRecord,
): record is PerfilamientoVisitaAnswers =>
  record.presupuestoDisponible !== null &&
  record.intencionApartarInmediato !== null &&
  record.decisorVisita !== null &&
  record.vioPublicidadRedes !== null;

export const perfilamientoVisitaToRow = (answers: PerfilamientoVisitaAnswers) => ({
  perfil_presupuesto_disponible: answers.presupuestoDisponible,
  perfil_intencion_apartar: answers.intencionApartarInmediato,
  perfil_decisor_visita: answers.decisorVisita,
  perfil_vio_publicidad_redes: answers.vioPublicidadRedes,
});

export const validatePerfilamientoVisitaInput = (
  input: Partial<PerfilamientoVisitaAnswers> | undefined,
): PerfilamientoVisitaAnswers => {
  if (!input) {
    throw new Error("Completa el cuestionario de perfilamiento.");
  }

  for (const question of PERFILAMIENTO_VISITA_QUESTIONS) {
    const value = input[question.key];
    if (typeof value !== "boolean") {
      throw new Error(`Responde sí o no: ${question.label}`);
    }
  }

  return input as PerfilamientoVisitaAnswers;
};

export const formatPerfilamientoSiNo = (value: boolean | null) => {
  if (value === null) {
    return "—";
  }
  return value ? "Sí" : "No";
};

/** Las 3 preguntas que definen la calificación A / B / C del lead (sin publicidad en redes). */
export const PERFILAMIENTO_CALIFICACION_KEYS: Array<keyof PerfilamientoVisitaAnswers> = [
  "presupuestoDisponible",
  "intencionApartarInmediato",
  "decisorVisita",
];

export type PerfilCalificacionLead = "A" | "B" | "C";

export const countPerfilamientoSi = (record: PerfilamientoVisitaRecord): number | null => {
  const values = PERFILAMIENTO_CALIFICACION_KEYS.map((key) => record[key]);
  if (values.some((value) => value === null)) {
    return null;
  }
  return values.filter(Boolean).length;
};

export const computePerfilCalificacionLead = (
  record: PerfilamientoVisitaRecord,
): PerfilCalificacionLead | null => {
  const yesCount = countPerfilamientoSi(record);
  if (yesCount === null) {
    return null;
  }
  if (yesCount === 3) {
    return "A";
  }
  if (yesCount === 2) {
    return "B";
  }
  return "C";
};

export const perfilCalificacionLeadDescription: Record<PerfilCalificacionLead, string> = {
  A: "3 criterios cumplidos: presupuesto, apartado inmediato y decisor de compra.",
  B: "2 de 3 criterios cumplidos.",
  C: "0 o 1 criterio cumplido.",
};

export const perfilCalificacionLeadColor: Record<PerfilCalificacionLead, string> = {
  A: "bg-emerald-600 text-white",
  B: "bg-blue-600 text-white",
  C: "bg-amber-400 text-amber-950",
};

export const perfilCalificacionLeadBannerClass: Record<PerfilCalificacionLead, string> = {
  A: "border-emerald-300 bg-emerald-50 text-emerald-950",
  B: "border-blue-300 bg-blue-50 text-blue-950",
  C: "border-amber-300 bg-amber-50 text-amber-950",
};

export const resolvePerfilCalificacionLead = (prospecto: {
  perfil_calificacion_lead?: string | null;
  perfil_presupuesto_disponible?: boolean | null;
  perfil_intencion_apartar?: boolean | null;
  perfil_decisor_visita?: boolean | null;
}): PerfilCalificacionLead | null => {
  const stored = prospecto.perfil_calificacion_lead?.trim().toUpperCase();
  if (stored === "A" || stored === "B" || stored === "C") {
    return stored;
  }
  return computePerfilCalificacionLead(readPerfilamientoVisitaFromProspecto(prospecto));
};
