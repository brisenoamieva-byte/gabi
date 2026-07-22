/**
 * Speed-to-lead: tiempo desde alta del lead hasta el primer toque del asesor.
 *
 * - Columna set-once: prospectos.first_contacted_at
 * - No cuenta WhatsApp automático del sistema (source system_auto_wa)
 * - Benchmarks premium: <5 min excelente, <60 min bueno, >24 h pobre
 *
 * Métricas puras: speed-to-lead-metrics.ts (seguro en cliente).
 */

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export {
  SPEED_TO_LEAD_VERSION,
  aggregateSpeedToLead,
  formatSpeedMinutesLabel,
  median,
  speedMinutesBetween,
  speedMinutesToScore,
  type SpeedToLeadAggregate,
} from "@/lib/comercial/speed-to-lead-metrics";

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
