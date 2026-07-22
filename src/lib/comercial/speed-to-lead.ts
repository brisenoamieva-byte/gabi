/**
 * Speed-to-lead: tiempo desde alta del lead hasta el primer toque del asesor.
 *
 * - Columna set-once: prospectos.first_contacted_at
 * - No cuenta WhatsApp automático del sistema (source system_auto_wa)
 * - Benchmarks premium: <5 min excelente, <60 min bueno, >24 h pobre
 */

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const SPEED_TO_LEAD_VERSION = "2026.1";

export type FirstContactSource =
  | "cadencia_asesor"
  | "cadencia_playbook_step"
  | "playbook_whatsapp-inicial"
  | "playbook_llamada-d0"
  | "playbook_contacto-24h"
  | "etapa_avance"
  | "backfill_cadencia_event"
  | "backfill_playbook"
  | (string & {});

const PLAYBOOK_FIRST_CONTACT_STEPS = new Set([
  "whatsapp-inicial",
  "llamada-d0",
  "contacto-24h",
]);

export const isPlaybookFirstContactStep = (stepId: string) =>
  PLAYBOOK_FIRST_CONTACT_STEPS.has(stepId);

export const speedMinutesBetween = (
  createdAt: string | null | undefined,
  firstContactedAt: string | null | undefined,
): number | null => {
  if (!createdAt || !firstContactedAt) return null;
  const start = Date.parse(createdAt);
  const end = Date.parse(firstContactedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const minutes = (end - start) / 60_000;
  if (minutes < 0) return 0;
  return Math.round(minutes * 10) / 10;
};

/**
 * Convierte minutos a score 0–100 (benchmarks speed-to-lead 2025/26).
 * null = sin dato → el scorecard redistribuye peso.
 */
export const speedMinutesToScore = (minutes: number | null | undefined): number | null => {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) {
    return null;
  }
  if (minutes <= 5) return 100;
  if (minutes <= 15) return 90;
  if (minutes <= 60) return 75;
  if (minutes <= 5 * 60) return 55;
  if (minutes <= 24 * 60) return 35;
  if (minutes <= 48 * 60) return 20;
  return 5;
};

export const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
  }
  return sorted[mid]!;
};

export type SpeedToLeadAggregate = {
  sampleSize: number;
  coveragePct: number;
  medianMinutes: number | null;
  pctUnder5Min: number;
  pctUnder60Min: number;
  pctUnder24h: number;
  /** Promedio de speedMinutesToScore; null si no hay muestra. */
  speedScorePct: number | null;
};

export const aggregateSpeedToLead = (
  minutesList: Array<number | null | undefined>,
  assignedCount: number,
): SpeedToLeadAggregate => {
  const samples = minutesList.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  const scores = samples
    .map((minutes) => speedMinutesToScore(minutes))
    .filter((value): value is number => value !== null);

  const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const den = samples.length;

  return {
    sampleSize: den,
    coveragePct: assignedCount > 0 ? clampPct((den / assignedCount) * 100) : 0,
    medianMinutes: median(samples),
    pctUnder5Min: den > 0 ? clampPct((samples.filter((m) => m <= 5).length / den) * 100) : 0,
    pctUnder60Min: den > 0 ? clampPct((samples.filter((m) => m <= 60).length / den) * 100) : 0,
    pctUnder24h:
      den > 0 ? clampPct((samples.filter((m) => m <= 24 * 60).length / den) * 100) : 0,
    speedScorePct:
      scores.length > 0
        ? clampPct(scores.reduce((sum, n) => sum + n, 0) / scores.length)
        : null,
  };
};

const isMissingColumnError = (message: string) =>
  /first_contacted_at|column .* does not exist/i.test(message);

/**
 * Set-once del primer contacto del asesor.
 * Seguro si la migración 076 aún no está aplicada (no rompe el flujo).
 */
export const recordFirstAdvisorContact = async (input: {
  prospectoId: string;
  desarrolloId: string;
  source: FirstContactSource;
  at?: string;
  asesorId?: string | null;
  /** Si true, no escribe lead_contact_events (ya se insertó en cadencia). */
  skipEvent?: boolean;
}): Promise<boolean> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return false;

  const at = input.at ?? new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from("prospectos")
      .update({
        first_contacted_at: at,
        first_contacted_source: input.source,
      })
      .eq("id", input.prospectoId)
      .is("first_contacted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      if (isMissingColumnError(error.message)) {
        return false;
      }
      console.warn("[speed-to-lead] update failed:", error.message);
      return false;
    }

    const wrote = Boolean(data?.id);
    if (!wrote || input.skipEvent) {
      return wrote;
    }

    await supabase.from("lead_contact_events").insert({
      prospecto_id: input.prospectoId,
      desarrollo_id: input.desarrolloId,
      canal: "asesor_first_touch",
      destinatario_tipo: "prospecto",
      status: "sent",
      payload: {
        source: input.source,
        asesorId: input.asesorId ?? null,
        recordedAt: at,
      },
    });

    return true;
  } catch (error) {
    console.warn(
      "[speed-to-lead] record failed:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
};

/** Etapas que implican que el asesor ya contactó / avanzó el lead. */
const ETAPAS_PRIMER_CONTACTO = new Set([
  "contactado",
  "cita",
  "visita",
  "apartado",
  "vendido",
]);

export const shouldRecordFirstContactOnEtapaChange = (
  fromEtapa: string,
  toEtapa: string,
): boolean => {
  if (fromEtapa !== "nuevo") return false;
  if (toEtapa === "nuevo" || toEtapa === "perdido" || toEtapa === "cancelado") {
    return false;
  }
  return ETAPAS_PRIMER_CONTACTO.has(toEtapa) || toEtapa !== "nuevo";
};

export const firstContactSourceFromCadencia = (source: string): FirstContactSource => {
  if (source === "playbook_step") return "cadencia_playbook_step";
  if (source === "system_auto_wa") return "system_auto_wa";
  return "cadencia_asesor";
};

export const firstContactSourceFromPlaybookStep = (stepId: string): FirstContactSource => {
  if (stepId === "whatsapp-inicial") return "playbook_whatsapp-inicial";
  if (stepId === "llamada-d0") return "playbook_llamada-d0";
  if (stepId === "contacto-24h") return "playbook_contacto-24h";
  return `playbook_${stepId}`;
};

export const formatSpeedMinutesLabel = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours * 10) / 10} h`;
  const days = hours / 24;
  return `${Math.round(days * 10) / 10} d`;
};
