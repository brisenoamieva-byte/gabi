import {
  LA_VISTA_RESIDENCIAL_ID,
  PASAJE_ALAMOS_ID,
} from "@/lib/catalog/desarrollos-registry";
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
] as const;

export type CrmPlaybookPilotDesarrolloId = (typeof CRM_PLAYBOOK_PILOT_DESARROLLO_IDS)[number];

export const isCrmPlaybookPilotDesarrollo = (desarrolloId: string): boolean =>
  (CRM_PLAYBOOK_PILOT_DESARROLLO_IDS as readonly string[]).includes(desarrolloId);

const basePasos = (): PlaybookStep[] => [
  {
    id: "contacto-24h",
    etapa: "nuevo",
    label: "Contactar en 24 h",
    hint: "Llamada, WhatsApp o mensaje de bienvenida.",
    kind: "manual",
    required: true,
    order: 10,
  },
  {
    id: "datos-completos",
    etapa: "nuevo",
    label: "Email y teléfono registrados",
    kind: "contacto",
    required: true,
    order: 20,
  },
  {
    id: "recorrido",
    etapa: "contactado",
    label: "Recorrido guiado realizado",
    hint: "Presenta desarrollo y producto en GABI.",
    kind: "recorrido",
    required: true,
    order: 30,
  },
  {
    id: "necesidades",
    etapa: "contactado",
    label: "Necesidades y producto identificado",
    kind: "manual",
    required: true,
    order: 40,
  },
  {
    id: "cotizacion",
    etapa: "cotizo",
    label: "Cotización enviada al cliente",
    kind: "cotizacion",
    required: true,
    order: 50,
  },
  {
    id: "seguimiento",
    etapa: "negociacion",
    label: "Seguimiento documentado en notas",
    hint: "Próximo contacto, objeciones y decisión.",
    kind: "manual",
    required: true,
    order: 60,
  },
];

export const DEFAULT_CRM_PLAYBOOKS: Record<CrmPlaybookPilotDesarrolloId, CrmPlaybookConfig> = {
  [PASAJE_ALAMOS_ID]: {
    desarrolloId: PASAJE_ALAMOS_ID,
    enabled: true,
    blockEtapa: true,
    steps: basePasos().map((step) =>
      step.id === "necesidades"
        ? {
            ...step,
            hint: "Deptos u oficinas según perfil del cliente.",
          }
        : step,
    ),
  },
  [LA_VISTA_RESIDENCIAL_ID]: {
    desarrolloId: LA_VISTA_RESIDENCIAL_ID,
    enabled: true,
    blockEtapa: true,
    steps: basePasos().map((step) =>
      step.id === "necesidades"
        ? {
            ...step,
            hint: "Cluster y tipología (Oliveto, Benevento, Volterra).",
          }
        : step,
    ),
  },
};

export const getDefaultCrmPlaybook = (desarrolloId: string): CrmPlaybookConfig | null => {
  if (!isCrmPlaybookPilotDesarrollo(desarrolloId)) {
    return null;
  }
  return DEFAULT_CRM_PLAYBOOKS[desarrolloId as CrmPlaybookPilotDesarrolloId];
};

export const sortPlaybookSteps = (steps: PlaybookStep[]) =>
  [...steps].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

export const getPlaybookStepsForEtapa = (config: CrmPlaybookConfig, etapa: ProspectoEtapa) =>
  sortPlaybookSteps(config.steps.filter((step) => step.etapa === etapa));

export const etapaIndex = (etapa: ProspectoEtapa) => PROSPECTO_ETAPAS.indexOf(etapa);

export type PlaybookProspectoSignals = {
  etapa: string;
  email: string | null;
  telefono: string | null;
  notas: string | null;
  visitaId: string | null;
  cotizacionesCount: number;
};

export const getAutoCompletedPlaybookStepIds = (signals: PlaybookProspectoSignals): Set<string> => {
  const done = new Set<string>();
  if (signals.email?.trim() && signals.telefono?.trim()) {
    done.add("datos-completos");
  }
  if (signals.visitaId || etapaIndex(signals.etapa as ProspectoEtapa) >= etapaIndex("contactado")) {
    done.add("recorrido");
  }
  if (signals.cotizacionesCount > 0 || etapaIndex(signals.etapa as ProspectoEtapa) >= etapaIndex("cotizo")) {
    done.add("cotizacion");
  }
  if (signals.notas?.trim() && etapaIndex(signals.etapa as ProspectoEtapa) >= etapaIndex("negociacion")) {
    done.add("seguimiento");
  }
  return done;
};

export const mergePlaybookProgress = (
  manualStepIds: string[],
  autoStepIds: Set<string>,
): Set<string> => {
  const merged = new Set(manualStepIds);
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
) =>
  getPlaybookStepsForEtapa(config, etapa).filter((step) => step.required && !completedIds.has(step.id));

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
