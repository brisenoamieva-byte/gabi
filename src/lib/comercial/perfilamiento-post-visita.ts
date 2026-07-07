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
  label: string;
}> = [
  {
    key: "presupuestoDisponible",
    label:
      "¿El prospecto tiene el presupuesto necesario y disponible para comprar en el desarrollo?",
  },
  {
    key: "intencionApartarInmediato",
    label: "¿El prospecto tiene intención de apartar de inmediato?",
  },
  {
    key: "decisorVisita",
    label:
      "¿El prospecto que atendió la visita es quien tomará la decisión final de comprar?",
  },
  {
    key: "vioPublicidadRedes",
    label:
      "Independientemente del medio de contacto, ¿el prospecto ha visto publicidad del desarrollo en redes sociales?",
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
    throw new Error("Completa el cuestionario de perfilamiento post-visita.");
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
