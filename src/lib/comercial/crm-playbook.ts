import {
  LA_VISTA_RESIDENCIAL_ID,
  PASAJE_ALAMOS_ID,
} from "@/lib/catalog/desarrollos-registry";
import { MISION_LA_GAVIA_DESARROLLO_ID } from "@/lib/catalog/mision-la-gavia";
import type { ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";
import { PROSPECTO_ETAPAS } from "@/lib/comercial/prospecto-etapas";

export type PlaybookActionKind = "manual" | "contacto" | "recorrido" | "cotizacion";

export type PlaybookStep = {
  id: string;
  etapa: ProspectoEtapa;
  label: string;
  hint?: string;
  kind: PlaybookActionKind;
  required: boolean;
  order: number;
};

export type CrmPlaybookConfig = {
  desarrolloId: string;
  enabled: boolean;
  blockEtapa: boolean;
  steps: PlaybookStep[];
  updatedAt?: string | null;
};

export const CRM_PLAYBOOK_PILOT_DESARROLLO_IDS = [
  PASAJE_ALAMOS_ID,
  LA_VISTA_RESIDENCIAL_ID,
  MISION_LA_GAVIA_DESARROLLO_ID,
] as const;

export type CrmPlaybookPilotDesarrolloId = (typeof CRM_PLAYBOOK_PILOT_DESARROLLO_IDS)[number];

export const isCrmPlaybookPilotDesarrollo = (desarrolloId: string): boolean =>
  (CRM_PLAYBOOK_PILOT_DESARROLLO_IDS as readonly string[]).includes(desarrolloId);

/** Objetivo de la fase Nuevo — alineado a secuencia BBR de perfilamiento. */
export const PLAYBOOK_PERFILAMIENTO_OBJETIVO =
  "Meta: agendar visita al desarrollo. No vender por teléfono; usa WhatsApp y llamada para invitar al recorrido.";

/** Ventanas horarias recomendadas (hora local del prospecto). */
export const PERFILAMIENTO_VENTANAS_HORARIAS = ["9–11 h", "12–14 h", "17–19 h"] as const;

const CADENCIA_HINT =
  "Si no responde: sigue la cadencia de 10 toques en 8 días (D0 WA+llamada, D1, pausa D2, D3, D4, pausa D5–6, D7 cierre). Tras el último intento, valora Descartado; no se mueve solo.";

const basePasos = (): PlaybookStep[] => [
  {
    id: "whatsapp-inicial",
    etapa: "nuevo",
    label: "WhatsApp de bienvenida",
    hint: `Inmediato al recibir el lead (SLA 1 h). Presenta el desarrollo e invita a visita. Horarios: ${PERFILAMIENTO_VENTANAS_HORARIAS.join(", ")}.`,
    kind: "contacto",
    required: true,
    order: 10,
  },
  {
    id: "llamada-d0",
    etapa: "nuevo",
    label: "Primera llamada (mismo día)",
    hint: `Due operativo ~2 h después del WA; ventana SLA hasta 5 h. Si no contesta, deja buzón breve. ${CADENCIA_HINT}`,
    kind: "contacto",
    required: true,
    order: 20,
  },
  {
    id: "datos-completos",
    etapa: "nuevo",
    label: "Teléfono registrado",
    hint: "Con el teléfono basta para avanzar a Contactado. El email es opcional.",
    kind: "contacto",
    required: true,
    order: 30,
  },
  {
    id: "visita-agendada",
    etapa: "contactado",
    label: "Cita agendada en el desarrollo",
    hint: "Programa la visita con fecha y horario. Si ya está en sitio (pase), marca «Visita al desarrollo realizada» — no hace falta agendar antes.",
    kind: "manual",
    required: true,
    order: 40,
  },
  {
    id: "recorrido",
    etapa: "cita",
    label: "Visita al desarrollo realizada",
    hint: "Confirma que el prospecto recorrió el desarrollo e indica la fecha. Si llegó sin cita, márcalo desde Contactado: pasa directo a Visita.",
    kind: "manual",
    required: true,
    order: 50,
  },
  {
    id: "necesidades-perfiladas",
    etapa: "visita",
    label: "Necesidades y perfil documentados",
    hint: "Obligatorio en etapa Visita. El perfilamiento (presupuesto, decisión, intención) define la calificación A/B/C.",
    kind: "manual",
    required: true,
    order: 60,
  },
  {
    id: "cotizacion",
    etapa: "visita",
    label: "Cotización enviada al cliente",
    hint: "Marca cuando el cliente recibió la cotización (también desde Contactado si ya cotizaste). Se completa sola al guardar desde el cotizador.",
    kind: "manual",
    required: true,
    order: 70,
  },
  {
    id: "seguimiento-post-cotizacion",
    etapa: "visita",
    label: "Seguimiento documentado en notas",
    hint: "Próximo contacto, objeciones y decisión (negociación dentro de la etapa visita).",
    kind: "manual",
    required: true,
    order: 80,
  },
];

const desarrolloNecesidadesHint: Partial<Record<CrmPlaybookPilotDesarrolloId, string>> = {
  [PASAJE_ALAMOS_ID]: "Deptos u oficinas según perfil del cliente.",
  [LA_VISTA_RESIDENCIAL_ID]: "Cluster y tipología (Oliveto, Benevento, Volterra).",
  [MISION_LA_GAVIA_DESARROLLO_ID]: "Torre, modelo (2R/3R) y nivel según perfil del cliente.",
};

export const getNecesidadesPerfilDesarrolloHint = (desarrolloId: string): string | null =>
  (desarrolloNecesidadesHint[desarrolloId as CrmPlaybookPilotDesarrolloId] ?? null);

const buildPilotPlaybook = (desarrolloId: CrmPlaybookPilotDesarrolloId): CrmPlaybookConfig => ({
  desarrolloId,
  enabled: true,
  blockEtapa: true,
  steps: basePasos(),
});

export const DEFAULT_CRM_PLAYBOOKS: Record<CrmPlaybookPilotDesarrolloId, CrmPlaybookConfig> = {
  [PASAJE_ALAMOS_ID]: buildPilotPlaybook(PASAJE_ALAMOS_ID),
  [LA_VISTA_RESIDENCIAL_ID]: buildPilotPlaybook(LA_VISTA_RESIDENCIAL_ID),
  [MISION_LA_GAVIA_DESARROLLO_ID]: buildPilotPlaybook(MISION_LA_GAVIA_DESARROLLO_ID),
};

/** IDs de pasos reemplazados por la secuencia de perfilamiento (compatibilidad). */
const LEGACY_STEP_ALIASES: Record<string, string[]> = {
  "contacto-24h": ["whatsapp-inicial", "llamada-d0"],
  necesidades: ["necesidades-perfiladas"],
  seguimiento: ["seguimiento-post-cotizacion"],
};

export const normalizeLegacyPlaybookStepIds = (stepIds: string[]): string[] => {
  const set = new Set(stepIds);
  for (const [legacyId, modernIds] of Object.entries(LEGACY_STEP_ALIASES)) {
    if (set.has(legacyId)) {
      for (const id of modernIds) {
        set.add(id);
      }
    }
  }
  return Array.from(set);
};

/** Fusiona pasos guardados en BD con defaults del código (nuevos pasos sin perder personalización). */
export const mergePlaybookConfigWithDefaults = (
  stored: PlaybookStep[],
  defaults: PlaybookStep[],
): PlaybookStep[] => {
  const storedById = new Map(stored.map((step) => [step.id, step]));
  const defaultIds = new Set(defaults.map((step) => step.id));

  const merged = defaults.map((def) => {
    const storedStep = storedById.get(def.id);
    if (!storedStep) {
      return def;
    }
    const preferCodeCopy = def.id === "datos-completos";
    return {
      ...def,
      ...storedStep,
      id: def.id,
      etapa: def.etapa,
      required: def.required,
      kind: def.kind,
      label: preferCodeCopy ? def.label : storedStep.label,
      hint: preferCodeCopy ? def.hint ?? storedStep.hint : def.hint ?? storedStep.hint,
    };
  });

  for (const step of stored) {
    if (!defaultIds.has(step.id) && !Object.keys(LEGACY_STEP_ALIASES).includes(step.id)) {
      merged.push(step);
    }
  }

  return sortPlaybookSteps(merged);
};

export const getDefaultCrmPlaybook = (desarrolloId: string): CrmPlaybookConfig => {
  if (isCrmPlaybookPilotDesarrollo(desarrolloId)) {
    return DEFAULT_CRM_PLAYBOOKS[desarrolloId as CrmPlaybookPilotDesarrolloId];
  }
  return buildGenericCrmPlaybook(desarrolloId);
};

export const buildGenericCrmPlaybook = (desarrolloId: string): CrmPlaybookConfig => ({
  desarrolloId,
  enabled: true,
  blockEtapa: true,
  steps: basePasos(),
});

export const sortPlaybookSteps = (steps: PlaybookStep[]) =>
  [...steps].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

export const getPlaybookStepsForEtapa = (config: CrmPlaybookConfig, etapa: ProspectoEtapa) =>
  sortPlaybookSteps(config.steps.filter((step) => step.etapa === etapa));

/**
 * Pasos a mostrar en el checklist del asesor.
 * - Contactado/Nuevo: permite marcar visita realizada (pase / walk-in) sin agendar cita.
 * - Contactado/Cita: permite marcar cotización anticipada.
 */
export const getPlaybookStepsVisibleForEtapa = (
  config: CrmPlaybookConfig,
  etapa: ProspectoEtapa,
): PlaybookStep[] => {
  const steps = getPlaybookStepsForEtapa(config, etapa);
  const extras: PlaybookStep[] = [];

  if (etapa === "nuevo" || etapa === "contactado") {
    const recorrido = config.steps.find((step) => step.id === "recorrido");
    if (recorrido && !steps.some((step) => step.id === "recorrido")) {
      extras.push({
        ...recorrido,
        required: false,
        order: 45,
        hint: "Si llegó sin cita (pase), marca la visita con la fecha. Pasa directo a Visita; no hace falta agendar antes.",
      });
    }
  }

  if (etapa === "contactado" || etapa === "cita") {
    const cotizacion = config.steps.find((step) => step.id === "cotizacion");
    if (cotizacion && !steps.some((step) => step.id === "cotizacion")) {
      extras.push({
        ...cotizacion,
        required: false,
        hint:
          cotizacion.hint ??
          "Opcional en esta etapa. Márcala si ya enviaste cotización; será obligatoria en Visita.",
      });
    }
  }

  if (!extras.length) {
    return steps;
  }

  return sortPlaybookSteps([...steps, ...extras]);
};

export const etapaIndex = (etapa: ProspectoEtapa) => PROSPECTO_ETAPAS.indexOf(etapa);

export type PlaybookProspectoSignals = {
  etapa: string;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  recorridoCompletado: boolean;
  cotizacionesCount: number;
  perfilamientoCompleto?: boolean;
};

const PERFILAMIENTO_STEP_IDS = new Set([
  "whatsapp-inicial",
  "llamada-d0",
  "datos-completos",
  "contacto-24h",
]);

/** Pasos de contacto inicial con botones WA / llamada en el checklist del asesor. */
export const PLAYBOOK_CONTACT_ACTION_STEP_IDS = new Set(["whatsapp-inicial", "llamada-d0"]);

export const getAutoCompletedPlaybookStepIds = (signals: PlaybookProspectoSignals): Set<string> => {
  const done = new Set<string>();
  if (signals.telefono?.trim()) {
    done.add("datos-completos");
  }
  if (
    signals.recorridoCompletado ||
    etapaIndex(signals.etapa as ProspectoEtapa) >= etapaIndex("visita")
  ) {
    done.add("recorrido");
    done.add("visita-agendada");
  }
  if (signals.cotizacionesCount > 0) {
    done.add("cotizacion");
  }
  if (signals.perfilamientoCompleto) {
    done.add("necesidades-perfiladas");
    done.add("necesidades");
  }
  if (signals.notas?.trim() && etapaIndex(signals.etapa as ProspectoEtapa) >= etapaIndex("visita")) {
    done.add("seguimiento-post-cotizacion");
    done.add("seguimiento");
  }
  return done;
};

export const mergePlaybookProgress = (
  manualStepIds: string[],
  autoStepIds: Set<string>,
): Set<string> => {
  const merged = new Set(normalizeLegacyPlaybookStepIds(manualStepIds));
  for (const id of Array.from(autoStepIds)) {
    merged.add(id);
  }
  return merged;
};

export const getNextPlaybookStep = (
  config: CrmPlaybookConfig,
  etapa: ProspectoEtapa,
  completedIds: Set<string>,
): PlaybookStep | null => {
  const steps = getPlaybookStepsForEtapa(config, etapa);
  return steps.find((step) => !completedIds.has(step.id)) ?? null;
};

export const getPendingRequiredForEtapa = (
  config: CrmPlaybookConfig,
  etapa: ProspectoEtapa,
  completedIds: Set<string>,
) => {
  const pending = getPlaybookStepsForEtapa(config, etapa).filter(
    (step) => step.required && !completedIds.has(step.id),
  );
  // Pase / walk-in: con visita realizada no exigimos cita agendada.
  if (completedIds.has("recorrido")) {
    return pending.filter((step) => step.id !== "visita-agendada");
  }
  return pending;
};

export const canAdvancePlaybookEtapa = (
  config: CrmPlaybookConfig,
  currentEtapa: ProspectoEtapa,
  targetEtapa: ProspectoEtapa,
  completedIds: Set<string>,
): { ok: true } | { ok: false; pending: PlaybookStep[] } => {
  if (!config.enabled || !config.blockEtapa) {
    return { ok: true };
  }

  const currentIdx = etapaIndex(currentEtapa);
  const targetIdx = etapaIndex(targetEtapa);

  if (targetIdx <= currentIdx) {
    return { ok: true };
  }

  if (targetEtapa === "perdido" || targetEtapa === "cancelado") {
    return { ok: true };
  }

  for (let idx = currentIdx; idx < targetIdx; idx += 1) {
    const etapa = PROSPECTO_ETAPAS[idx];
    const pending = getPendingRequiredForEtapa(config, etapa, completedIds);
    if (pending.length) {
      return { ok: false, pending };
    }
  }

  return { ok: true };
};

export type PlaybookQueueItem = {
  prospectoId: string;
  nombre: string;
  etapa: ProspectoEtapa;
  updatedAt: string;
  nextStep: PlaybookStep | null;
  pendingRequired: number;
  priorityScore: number;
};

export const scorePlaybookQueueItem = (
  etapa: ProspectoEtapa,
  pendingRequired: number,
  updatedAt: string,
): number => {
  const ageHours = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60);
  const etapaWeight = (PROSPECTO_ETAPAS.length - etapaIndex(etapa)) * 10;
  const urgency = Math.min(ageHours / 24, 14) * 5;
  return pendingRequired * 100 + etapaWeight + urgency;
};

/** Plazos SLA por paso (horas desde la fecha base del prospecto). */
export const PLAYBOOK_STEP_SLA_HOURS: Record<string, number> = {
  "whatsapp-inicial": 1,
  "llamada-d0": 5,
  "datos-completos": 48,
  "visita-agendada": 168,
  "contacto-24h": 24,
  recorrido: 72,
  "necesidades-perfiladas": 72,
  necesidades: 72,
  cotizacion: 96,
  "seguimiento-post-cotizacion": 168,
  seguimiento: 168,
};

export const DEFAULT_PLAYBOOK_SLA_HOURS = 72;

export type ComplianceIssueStatus = "pending" | "overdue";

export type PlaybookComplianceIssue = {
  stepId: string;
  stepLabel: string;
  stepEtapa: ProspectoEtapa;
  status: ComplianceIssueStatus;
  dueAt: string;
  hoursOverdue: number;
};

export const getPlaybookStepSlaHours = (stepId: string): number =>
  PLAYBOOK_STEP_SLA_HOURS[stepId] ?? DEFAULT_PLAYBOOK_SLA_HOURS;

export const getPlaybookStepBaseTimestamp = (
  step: PlaybookStep,
  prospecto: { created_at: string; updated_at: string },
): string =>
  PERFILAMIENTO_STEP_IDS.has(step.id) || step.etapa === "nuevo"
    ? prospecto.created_at
    : prospecto.updated_at;

export const getPlaybookStepDueAt = (
  step: PlaybookStep,
  prospecto: { created_at: string; updated_at: string },
): Date => {
  const baseMs = new Date(getPlaybookStepBaseTimestamp(step, prospecto)).getTime();
  const slaHours = getPlaybookStepSlaHours(step.id);
  return new Date(baseMs + slaHours * 60 * 60 * 1000);
};

export const classifyPlaybookComplianceIssue = (
  step: PlaybookStep,
  prospecto: { created_at: string; updated_at: string },
  now = Date.now(),
): PlaybookComplianceIssue => {
  const dueAt = getPlaybookStepDueAt(step, prospecto);
  const overdueMs = now - dueAt.getTime();
  const hoursOverdue = overdueMs > 0 ? overdueMs / (1000 * 60 * 60) : 0;

  return {
    stepId: step.id,
    stepLabel: step.label,
    stepEtapa: step.etapa,
    status: overdueMs > 0 ? "overdue" : "pending",
    dueAt: dueAt.toISOString(),
    hoursOverdue: Math.round(hoursOverdue * 10) / 10,
  };
};

export const getAllPendingRequiredUpToEtapa = (
  config: CrmPlaybookConfig,
  etapa: ProspectoEtapa,
  completedIds: Set<string>,
): PlaybookStep[] => {
  const currentIdx = etapaIndex(etapa);
  const pending: PlaybookStep[] = [];

  for (let idx = 0; idx <= currentIdx; idx += 1) {
    const stepEtapa = PROSPECTO_ETAPAS[idx];
    pending.push(...getPendingRequiredForEtapa(config, stepEtapa, completedIds));
  }

  return pending;
};

/** Datos mínimos de contacto: basta con teléfono (email opcional). */
export const hasCompleteContactData = (
  _email: string | null,
  telefono: string | null,
): boolean => Boolean(telefono?.trim());
