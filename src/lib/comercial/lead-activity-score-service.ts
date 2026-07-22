import {
  computeLeadActivityScore,
  DEFAULT_LEAD_SCORE_ACTIONS,
  mergeLeadScoreActionsWithDefaults,
  signalsFromProspectoRow,
  type LeadActivityScoreLine,
  type LeadScoreAction,
} from "@/lib/comercial/lead-activity-score";
import { normalizeLegacyPlaybookStepIds } from "@/lib/comercial/crm-playbook";
import type { ProspectoRecord } from "@/lib/comercial/sembrado-status";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type DbLeadScoreActionRow = {
  id: string;
  scope: "lead" | "asesor";
  label: string;
  hint: string;
  points: number;
  enabled: boolean;
  sort_order: number;
};

const mapActionRow = (row: DbLeadScoreActionRow): LeadScoreAction => ({
  id: row.id,
  scope: row.scope,
  label: row.label,
  hint: row.hint ?? "",
  points: row.points,
  enabled: row.enabled,
  sortOrder: row.sort_order,
});

export const listLeadScoreActions = async (
  scope: "lead" | "asesor" = "lead",
): Promise<LeadScoreAction[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return DEFAULT_LEAD_SCORE_ACTIONS.filter((item) => item.scope === scope);
  }

  const { data, error } = await supabase
    .from("lead_score_actions")
    .select("id, scope, label, hint, points, enabled, sort_order")
    .eq("scope", scope)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    return DEFAULT_LEAD_SCORE_ACTIONS.filter((item) => item.scope === scope);
  }

  return mergeLeadScoreActionsWithDefaults(
    data.map((row) => mapActionRow(row as DbLeadScoreActionRow)),
  );
};

export const updateLeadScoreAction = async (
  id: string,
  input: { points?: number; enabled?: boolean; label?: string; hint?: string },
  updatedBy?: string | null,
): Promise<LeadScoreAction> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: updatedBy ?? null,
  };
  if (input.points !== undefined) {
    patch.points = Math.max(0, Math.round(input.points));
  }
  if (input.enabled !== undefined) {
    patch.enabled = input.enabled;
  }
  if (input.label !== undefined) {
    const label = input.label.trim();
    if (label) {
      patch.label = label;
    }
  }
  if (input.hint !== undefined) {
    patch.hint = input.hint.trim();
  }

  const { data, error } = await supabase
    .from("lead_score_actions")
    .update(patch)
    .eq("id", id)
    .select("id, scope, label, hint, points, enabled, sort_order")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Acción no encontrada.");
  }

  return mapActionRow(data as DbLeadScoreActionRow);
};

const loadPlaybookStepIds = async (prospectoId: string): Promise<string[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("prospecto_playbook_progress")
    .select("step_id")
    .eq("prospecto_id", prospectoId);

  if (error || !data?.length) {
    return [];
  }

  return normalizeLegacyPlaybookStepIds(data.map((row) => row.step_id as string));
};

const loadCadenciaCanales = async (
  prospectoId: string,
): Promise<Array<"whatsapp" | "llamada">> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("prospecto_cadencia_touches")
    .select("canal, completed_at")
    .eq("prospecto_id", prospectoId)
    .not("completed_at", "is", null);

  if (error || !data?.length) {
    return [];
  }

  const set = new Set<"whatsapp" | "llamada">();
  for (const row of data) {
    if (row.canal === "whatsapp" || row.canal === "llamada") {
      set.add(row.canal);
    }
  }
  return Array.from(set);
};

const loadCotizacionesCount = async (prospectoId: string): Promise<number> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return 0;
  }

  const { count, error } = await supabase
    .from("cotizaciones")
    .select("id", { count: "exact", head: true })
    .eq("prospecto_id", prospectoId);

  if (error) {
    return 0;
  }
  return count ?? 0;
};

const loadRecorridoCompletado = async (
  prospecto: Pick<ProspectoRecord, "visita_id" | "visita_realizada_on">,
): Promise<boolean> => {
  if (prospecto.visita_realizada_on) {
    return true;
  }
  if (!prospecto.visita_id) {
    return false;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return false;
  }

  const { data } = await supabase
    .from("visitas_comerciales")
    .select("tipo")
    .eq("id", prospecto.visita_id)
    .maybeSingle();

  return data?.tipo === "recorrido_completado";
};

export const recomputeLeadActivityScore = async (
  prospectoId: string,
): Promise<{ score: number; detail: LeadActivityScoreLine[] } | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data: prospecto, error } = await supabase
    .from("prospectos")
    .select("*")
    .eq("id", prospectoId)
    .maybeSingle();

  if (error || !prospecto) {
    return null;
  }

  const row = prospecto as ProspectoRecord;
  const [actions, playbookStepIds, cadenciaCanales, cotizacionesCount, recorridoCompletado] =
    await Promise.all([
      listLeadScoreActions("lead"),
      loadPlaybookStepIds(prospectoId),
      loadCadenciaCanales(prospectoId),
      loadCotizacionesCount(prospectoId),
      loadRecorridoCompletado(row),
    ]);

  const result = computeLeadActivityScore(
    signalsFromProspectoRow(row, {
      playbookStepIds,
      cadenciaCanalesCompletados: cadenciaCanales,
      cotizacionesCount,
      recorridoCompletado,
    }),
    actions,
  );

  const { error: updateError } = await supabase
    .from("prospectos")
    .update({
      lead_activity_score: result.score,
      lead_activity_score_detail: result.detail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", prospectoId);

  if (updateError) {
    if (
      updateError.message.includes("lead_activity_score") ||
      updateError.message.includes("schema cache")
    ) {
      return result;
    }
    throw new Error(updateError.message);
  }

  return result;
};

/** Recalcula sin lanzar; útil en hooks fire-and-forget. */
export const recomputeLeadActivityScoreSafe = async (prospectoId: string): Promise<void> => {
  try {
    await recomputeLeadActivityScore(prospectoId);
  } catch {
    /* no bloquear flujos comerciales */
  }
};
