/**
 * Score de lead por acciones acumuladas (estilo Experience).
 * No reemplaza `iscore` (import Xperience); usa `lead_activity_score`.
 */

import {
  normalizeLeadEmail,
  normalizeLeadPhone,
} from "@/lib/comercial/lead-scoring";
import { calificacionEsSpam } from "@/lib/comercial/xperience-leads";
import { normalizeProspectoEtapaValue } from "@/lib/comercial/prospecto-etapas";
import type { ProspectoRecord } from "@/lib/comercial/sembrado-status";

export type LeadScoreActionScope = "lead" | "asesor";

export type LeadScoreAction = {
  id: string;
  scope: LeadScoreActionScope;
  label: string;
  hint: string;
  points: number;
  enabled: boolean;
  sortOrder: number;
};

export type LeadActivityScoreLine = {
  id: string;
  label: string;
  points: number;
};

export type LeadActivityScoreResult = {
  score: number;
  detail: LeadActivityScoreLine[];
};

export type LeadActivitySignals = {
  email: string | null;
  telefono: string | null;
  campanaId: string | null;
  createdAt: string;
  firstContactedAt: string | null;
  visitaAgendadaOn: string | null;
  visitaRealizadaOn: string | null;
  perfilCalificacionLead: string | null;
  etapa: string;
  esSpam: boolean;
  esDuplicado: boolean;
  calificacion: string | null;
  playbookStepIds: string[];
  cadenciaCanalesCompletados: Array<"whatsapp" | "llamada">;
  cotizacionesCount: number;
  recorridoCompletado: boolean;
};

export const DEFAULT_LEAD_SCORE_ACTIONS: LeadScoreAction[] = [
  {
    id: "telefono-valido",
    scope: "lead",
    label: "Teléfono válido",
    hint: "Aumenta score si el número tiene 10 dígitos MX.",
    points: 2,
    enabled: true,
    sortOrder: 10,
  },
  {
    id: "email-valido",
    scope: "lead",
    label: "Email válido",
    hint: "Aumenta score si el correo es válido para contacto.",
    points: 2,
    enabled: true,
    sortOrder: 20,
  },
  {
    id: "telefono-y-email",
    scope: "lead",
    label: "Teléfono y email",
    hint: "Aumenta score cuando el lead tiene ambos canales.",
    points: 2,
    enabled: true,
    sortOrder: 30,
  },
  {
    id: "campana",
    scope: "lead",
    label: "Origen con campaña",
    hint: "Aumenta score si el lead llegó ligado a una campaña digital.",
    points: 3,
    enabled: true,
    sortOrder: 40,
  },
  {
    id: "contacto-rapido",
    scope: "lead",
    label: "Primer contacto < 1 h",
    hint: "Aumenta score cuando el asesor contactó en menos de 1 hora.",
    points: 5,
    enabled: true,
    sortOrder: 50,
  },
  {
    id: "whatsapp",
    scope: "lead",
    label: "WhatsApp registrado",
    hint: "Aumenta score al completar toque WhatsApp (playbook o cadencia).",
    points: 3,
    enabled: true,
    sortOrder: 60,
  },
  {
    id: "llamada",
    scope: "lead",
    label: "Llamada registrada",
    hint: "Aumenta score al completar toque de llamada (playbook o cadencia).",
    points: 5,
    enabled: true,
    sortOrder: 70,
  },
  {
    id: "cita-agendada",
    scope: "lead",
    label: "Cita agendada",
    hint: "Aumenta score cuando hay visita agendada en el desarrollo.",
    points: 8,
    enabled: true,
    sortOrder: 80,
  },
  {
    id: "visita-recorrido",
    scope: "lead",
    label: "Visita / recorrido",
    hint: "Aumenta score cuando el prospecto recorrió el desarrollo.",
    points: 12,
    enabled: true,
    sortOrder: 90,
  },
  {
    id: "perfil-a",
    scope: "lead",
    label: "Perfilamiento A",
    hint: "Lead con 3 Sí en presupuesto, intención y decisor.",
    points: 10,
    enabled: true,
    sortOrder: 100,
  },
  {
    id: "perfil-b",
    scope: "lead",
    label: "Perfilamiento B",
    hint: "Lead con 2 Sí en presupuesto, intención y decisor.",
    points: 6,
    enabled: true,
    sortOrder: 110,
  },
  {
    id: "perfil-c",
    scope: "lead",
    label: "Perfilamiento C",
    hint: "Lead con 0–1 Sí en presupuesto, intención y decisor.",
    points: 2,
    enabled: true,
    sortOrder: 120,
  },
  {
    id: "cotizacion",
    scope: "lead",
    label: "Cotización enviada",
    hint: "Aumenta score cuando hay cotización o paso de cotización completo.",
    points: 10,
    enabled: true,
    sortOrder: 130,
  },
  {
    id: "apartado",
    scope: "lead",
    label: "Apartado",
    hint: "Aumenta score al llegar a etapa Apartado.",
    points: 15,
    enabled: true,
    sortOrder: 140,
  },
  {
    id: "vendido",
    scope: "lead",
    label: "Vendido",
    hint: "Aumenta score al llegar a etapa Vendido.",
    points: 20,
    enabled: true,
    sortOrder: 150,
  },
];

/**
 * Techo de referencia para normalizar activity score a 0–100.
 * Excluye perfil-b/c (mutuamente excluyentes con perfil-a).
 */
export const getLeadActivityScoreReferenceMax = (
  actions: LeadScoreAction[] = DEFAULT_LEAD_SCORE_ACTIONS,
): number => {
  const skip = new Set(["perfil-b", "perfil-c"]);
  let sum = 0;
  for (const action of actions) {
    if (!action.enabled || action.scope !== "lead" || skip.has(action.id)) {
      continue;
    }
    sum += Math.max(0, action.points);
  }
  return Math.max(sum, 1);
};

const pointsById = (actions: LeadScoreAction[], id: string): LeadScoreAction | null =>
  actions.find((item) => item.id === id && item.enabled) ?? null;

const pushIf = (
  detail: LeadActivityScoreLine[],
  action: LeadScoreAction | null,
  condition: boolean,
) => {
  if (!action || !condition || action.points === 0) {
    return;
  }
  detail.push({ id: action.id, label: action.label, points: action.points });
};

const contactedWithinOneHour = (createdAt: string, firstContactedAt: string | null): boolean => {
  if (!firstContactedAt) {
    return false;
  }
  const createdMs = new Date(createdAt).getTime();
  const contactedMs = new Date(firstContactedAt).getTime();
  if (Number.isNaN(createdMs) || Number.isNaN(contactedMs)) {
    return false;
  }
  return contactedMs - createdMs <= 60 * 60 * 1000 && contactedMs >= createdMs - 60_000;
};

export const computeLeadActivityScore = (
  signals: LeadActivitySignals,
  actions: LeadScoreAction[] = DEFAULT_LEAD_SCORE_ACTIONS,
): LeadActivityScoreResult => {
  if (
    calificacionEsSpam(signals.calificacion) ||
    signals.esSpam ||
    signals.esDuplicado
  ) {
    return { score: 0, detail: [] };
  }

  const detail: LeadActivityScoreLine[] = [];
  const phoneOk = Boolean(normalizeLeadPhone(signals.telefono));
  const emailOk = Boolean(normalizeLeadEmail(signals.email));
  const playbook = new Set(signals.playbookStepIds);
  const cadenciaWa = signals.cadenciaCanalesCompletados.includes("whatsapp");
  const cadenciaLlamada = signals.cadenciaCanalesCompletados.includes("llamada");
  const etapa =
    normalizeProspectoEtapaValue(signals.etapa) ?? signals.etapa;

  pushIf(detail, pointsById(actions, "telefono-valido"), phoneOk);
  pushIf(detail, pointsById(actions, "email-valido"), emailOk);
  pushIf(detail, pointsById(actions, "telefono-y-email"), phoneOk && emailOk);
  pushIf(detail, pointsById(actions, "campana"), Boolean(signals.campanaId));
  pushIf(
    detail,
    pointsById(actions, "contacto-rapido"),
    contactedWithinOneHour(signals.createdAt, signals.firstContactedAt),
  );
  pushIf(
    detail,
    pointsById(actions, "whatsapp"),
    cadenciaWa || playbook.has("whatsapp-inicial") || playbook.has("contacto-24h"),
  );
  pushIf(
    detail,
    pointsById(actions, "llamada"),
    cadenciaLlamada || playbook.has("llamada-d0") || playbook.has("contacto-24h"),
  );
  pushIf(
    detail,
    pointsById(actions, "cita-agendada"),
    Boolean(signals.visitaAgendadaOn) || playbook.has("visita-agendada"),
  );
  pushIf(
    detail,
    pointsById(actions, "visita-recorrido"),
    Boolean(signals.visitaRealizadaOn) ||
      signals.recorridoCompletado ||
      playbook.has("recorrido"),
  );

  const perfil = (signals.perfilCalificacionLead ?? "").toUpperCase();
  if (perfil === "A") {
    pushIf(detail, pointsById(actions, "perfil-a"), true);
  } else if (perfil === "B") {
    pushIf(detail, pointsById(actions, "perfil-b"), true);
  } else if (perfil === "C") {
    pushIf(detail, pointsById(actions, "perfil-c"), true);
  }

  pushIf(
    detail,
    pointsById(actions, "cotizacion"),
    signals.cotizacionesCount > 0 || playbook.has("cotizacion"),
  );
  pushIf(detail, pointsById(actions, "apartado"), etapa === "apartado");
  pushIf(detail, pointsById(actions, "vendido"), etapa === "vendido");

  const score = detail.reduce((sum, line) => sum + line.points, 0);
  return { score, detail };
};

export const signalsFromProspectoRow = (
  prospecto: Pick<
    ProspectoRecord,
    | "email"
    | "telefono"
    | "campana_id"
    | "created_at"
    | "first_contacted_at"
    | "visita_agendada_on"
    | "visita_realizada_on"
    | "perfil_calificacion_lead"
    | "etapa"
    | "es_spam"
    | "es_duplicado"
    | "calificacion"
  >,
  extras: {
    playbookStepIds?: string[];
    cadenciaCanalesCompletados?: Array<"whatsapp" | "llamada">;
    cotizacionesCount?: number;
    recorridoCompletado?: boolean;
  } = {},
): LeadActivitySignals => ({
  email: prospecto.email,
  telefono: prospecto.telefono,
  campanaId: prospecto.campana_id,
  createdAt: prospecto.created_at,
  firstContactedAt: prospecto.first_contacted_at ?? null,
  visitaAgendadaOn: prospecto.visita_agendada_on,
  visitaRealizadaOn: prospecto.visita_realizada_on,
  perfilCalificacionLead: prospecto.perfil_calificacion_lead,
  etapa: prospecto.etapa,
  esSpam: prospecto.es_spam,
  esDuplicado: prospecto.es_duplicado,
  calificacion: prospecto.calificacion,
  playbookStepIds: extras.playbookStepIds ?? [],
  cadenciaCanalesCompletados: extras.cadenciaCanalesCompletados ?? [],
  cotizacionesCount: extras.cotizacionesCount ?? 0,
  recorridoCompletado: extras.recorridoCompletado ?? false,
});

export const formatLeadActivityScoreDetail = (
  detail: LeadActivityScoreLine[] | null | undefined,
): string => {
  if (!detail?.length) {
    return "Sin acciones puntuadas aún.";
  }
  return detail.map((line) => `${line.label} +${line.points}`).join(" · ");
};

export const mergeLeadScoreActionsWithDefaults = (
  stored: LeadScoreAction[],
): LeadScoreAction[] => {
  const byId = new Map(stored.map((item) => [item.id, item]));
  return DEFAULT_LEAD_SCORE_ACTIONS.map((def) => {
    const row = byId.get(def.id);
    if (!row) {
      return def;
    }
    return {
      ...def,
      ...row,
      id: def.id,
      scope: def.scope,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "es"));
};
