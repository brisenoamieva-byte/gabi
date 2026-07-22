import type { ProspectoDetail, ProspectoListRow } from "@/lib/admin/prospectos-service";
import { listProspectos } from "@/lib/admin/prospectos-service";
import { isLeadershipAsesorId, resolveProspectoAsesorFilter } from "@/lib/asesores/leadership-access";
import {
  canAdvancePlaybookEtapa,
  getAutoCompletedPlaybookStepIds,
  getDefaultCrmPlaybook,
  getNextPlaybookStep,
  getPendingRequiredForEtapa,
  mergePlaybookConfigWithDefaults,
  mergePlaybookProgress,
  normalizeLegacyPlaybookStepIds,
  scorePlaybookQueueItem,
  sortPlaybookSteps,
  type CrmPlaybookConfig,
  type PlaybookQueueItem,
  type PlaybookStep,
} from "@/lib/comercial/crm-playbook";
import {
  isProspectoEtapa,
  mergeProspectoEtapa,
  normalizeProspectoEtapaValue,
  PROSPECTO_ETAPA_FILTER_EN_SEGUIMIENTO,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { validateAsesorForVisita } from "@/lib/visitas/service";
import {
  completeCadenciaForProspecto,
  completeCadenciaTouchForPlaybookStep,
} from "@/lib/comercial/cadencia-service";
import { normalizePlaybookVisitDate, normalizePlaybookVisitTime } from "@/lib/comercial/cadencia-perfilamiento";
import {
  computePerfilCalificacionLead,
  isPerfilamientoVisitaComplete,
  mergePerfilamientoVisitaAnswers,
  perfilamientoVisitaPartialToRow,
  PLAYBOOK_PERFILAMIENTO_VISITA_STEP_IDS,
  readPerfilamientoVisitaFromProspecto,
  validatePerfilamientoVisitaPartialInput,
  type PerfilamientoVisitaAnswers,
} from "@/lib/comercial/perfilamiento-post-visita";

const PLAYBOOK_ACTIVE_ETAPAS = new Set<ProspectoEtapa>([
  "nuevo",
  "contactado",
  "cita",
  "visita",
]);

type DbPlaybookConfigRow = {
  desarrollo_id: string;
  enabled: boolean;
  block_etapa: boolean;
  steps: PlaybookStep[] | null;
  updated_at: string | null;
};

const parsePlaybookSteps = (raw: unknown, fallback: PlaybookStep[]): PlaybookStep[] => {
  if (!Array.isArray(raw)) {
    return fallback;
  }

  const parsed = raw
    .filter((item): item is PlaybookStep => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const step = item as PlaybookStep;
      return (
        typeof step.id === "string" &&
        typeof step.label === "string" &&
        isProspectoEtapa(step.etapa) &&
        typeof step.required === "boolean" &&
        typeof step.order === "number"
      );
    })
    .map((step) => ({
      ...step,
      kind: step.kind ?? "manual",
    }));

  return parsed.length ? sortPlaybookSteps(parsed) : fallback;
};

const mapDbConfig = (row: DbPlaybookConfigRow, defaultConfig: CrmPlaybookConfig): CrmPlaybookConfig => {
  const storedSteps = parsePlaybookSteps(row.steps, defaultConfig.steps);
  return {
    desarrolloId: row.desarrollo_id,
    enabled: row.enabled,
    blockEtapa: row.block_etapa,
    steps: mergePlaybookConfigWithDefaults(storedSteps, defaultConfig.steps),
    updatedAt: row.updated_at,
  };
};

export const getCrmPlaybookConfig = async (desarrolloId: string): Promise<CrmPlaybookConfig> => {
  const defaultConfig = getDefaultCrmPlaybook(desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return defaultConfig;
  }

  const { data, error } = await supabase
    .from("crm_playbook_configs")
    .select("desarrollo_id, enabled, block_etapa, steps, updated_at")
    .eq("desarrollo_id", desarrolloId)
    .maybeSingle();

  if (error || !data) {
    return defaultConfig;
  }

  return mapDbConfig(data as DbPlaybookConfigRow, defaultConfig);
};

export const upsertCrmPlaybookConfig = async (
  desarrolloId: string,
  input: {
    enabled: boolean;
    blockEtapa: boolean;
    steps: PlaybookStep[];
  },
  updatedBy?: string | null,
): Promise<CrmPlaybookConfig> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const pilotDefault = getDefaultCrmPlaybook(desarrolloId);
  const defaultConfig = pilotDefault;
  const steps = sortPlaybookSteps(parsePlaybookSteps(input.steps, defaultConfig.steps));

  const { error } = await supabase.from("crm_playbook_configs").upsert(
    {
      desarrollo_id: desarrolloId,
      enabled: input.enabled,
      block_etapa: input.blockEtapa,
      steps,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    },
    { onConflict: "desarrollo_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  return (await getCrmPlaybookConfig(desarrolloId));
};

export const getPlaybookProgressMap = async (prospectoIds: string[]): Promise<Map<string, string[]>> => {
  const map = new Map<string, string[]>();
  if (!prospectoIds.length) {
    return map;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return map;
  }

  const { data, error } = await supabase
    .from("prospecto_playbook_progress")
    .select("prospecto_id, step_id")
    .in("prospecto_id", prospectoIds);

  if (error || !data) {
    return map;
  }

  for (const row of data) {
    const id = row.prospecto_id as string;
    const stepId = row.step_id as string;
    const existing = map.get(id) ?? [];
    existing.push(...normalizeLegacyPlaybookStepIds([stepId]));
    map.set(id, existing);
  }

  return map;
};

export const getCotizacionCountMap = async (prospectoIds: string[]): Promise<Map<string, number>> => {
  const map = new Map<string, number>();
  if (!prospectoIds.length) {
    return map;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return map;
  }

  const { data, error } = await supabase
    .from("cotizaciones")
    .select("prospecto_id")
    .in("prospecto_id", prospectoIds);

  if (error || !data) {
    return map;
  }

  for (const row of data) {
    const id = row.prospecto_id as string;
    map.set(id, (map.get(id) ?? 0) + 1);
  }

  return map;
};

export type ProspectoPlaybookState = {
  config: CrmPlaybookConfig | null;
  completedStepIds: string[];
  /** Pasos marcados a mano (se pueden desmarcar). */
  manualCompletedStepIds: string[];
  nextStep: PlaybookStep | null;
  pendingRequired: PlaybookStep[];
  canAdvanceEtapa: boolean;
  blockReason: string | null;
};

const buildPlaybookSignals = (
  prospecto: ProspectoListRow | ProspectoDetail,
  cotizacionesCount = 0,
  recorridoCompletado = false,
) => ({
  etapa: prospecto.etapa,
  email: prospecto.email,
  telefono: prospecto.telefono,
  notas: prospecto.notas,
  recorridoCompletado,
  cotizacionesCount,
  perfilamientoCompleto: isPerfilamientoVisitaComplete(
    readPerfilamientoVisitaFromProspecto(prospecto),
  ),
});

const resolveRecorridoCompletadoForProspecto = async (
  prospecto: Pick<ProspectoListRow, "visita_id">,
): Promise<boolean> => {
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

/** Mapa prospectoId → si tiene visita GABI tipo recorrido_completado. */
export const resolveRecorridoCompletadoMap = async (
  prospectos: Pick<ProspectoListRow, "id" | "visita_id">[],
): Promise<Map<string, boolean>> => {
  const map = new Map<string, boolean>();
  const visitaIds = Array.from(
    new Set(prospectos.map((row) => row.visita_id).filter((id): id is string => Boolean(id))),
  );

  if (!visitaIds.length) {
    return map;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return map;
  }

  const { data } = await supabase.from("visitas_comerciales").select("id, tipo").in("id", visitaIds);

  const completedIds = new Set(
    (data ?? []).filter((row) => row.tipo === "recorrido_completado").map((row) => row.id as string),
  );

  for (const prospecto of prospectos) {
    if (prospecto.visita_id && completedIds.has(prospecto.visita_id)) {
      map.set(prospecto.id, true);
    }
  }

  return map;
};

export const computeProspectoPlaybookState = (
  prospecto: ProspectoListRow | ProspectoDetail,
  config: CrmPlaybookConfig | null,
  manualStepIds: string[],
  cotizacionesCount = 0,
  recorridoCompletado = false,
): ProspectoPlaybookState => {
  if (!config?.enabled) {
    return {
      config: null,
      completedStepIds: [],
      manualCompletedStepIds: [],
      nextStep: null,
      pendingRequired: [],
      canAdvanceEtapa: true,
      blockReason: null,
    };
  }

  const etapa = isProspectoEtapa(prospecto.etapa) ? prospecto.etapa : "nuevo";
  const autoIds = getAutoCompletedPlaybookStepIds(
    buildPlaybookSignals(prospecto, cotizacionesCount, recorridoCompletado),
  );
  const manualIds = normalizeLegacyPlaybookStepIds(manualStepIds);
  const completedIds = mergePlaybookProgress(manualIds, autoIds);
  const nextStep = getNextPlaybookStep(config, etapa, completedIds);
  const pendingRequired = getPendingRequiredForEtapa(config, etapa, completedIds);

  let canAdvanceEtapa = true;
  let blockReason: string | null = null;

  if (config.blockEtapa && pendingRequired.length) {
    canAdvanceEtapa = false;
    blockReason = `Completa: ${pendingRequired.map((step) => step.label).join(", ")}`;
  }

  return {
    config,
    completedStepIds: Array.from(completedIds),
    manualCompletedStepIds: Array.from(new Set(manualIds)),
    nextStep,
    pendingRequired,
    canAdvanceEtapa,
    blockReason,
  };
};

export const getProspectoPlaybookState = async (
  prospecto: ProspectoDetail,
): Promise<ProspectoPlaybookState> => {
  const config = await getCrmPlaybookConfig(prospecto.desarrollo_id);
  const progressMap = await getPlaybookProgressMap([prospecto.id]);
  const manualStepIds = progressMap.get(prospecto.id) ?? [];
  const recorridoCompletado = await resolveRecorridoCompletadoForProspecto(prospecto);

  return computeProspectoPlaybookState(
    prospecto,
    config,
    manualStepIds,
    prospecto.cotizaciones.length,
    recorridoCompletado,
  );
};

export const completePlaybookStepForProspecto = async (
  asesorId: string,
  prospectoId: string,
  stepId: string,
  stepDate?: string,
  perfilamientoVisita?: Partial<PerfilamientoVisitaAnswers>,
  stepTime?: string,
): Promise<{ playbook: ProspectoPlaybookState; prospecto: ProspectoListRow }> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: prospectoRow, error: prospectoError } = await supabase
    .from("prospectos")
    .select(
      "id, desarrollo_id, asesor_id, etapa, perfil_presupuesto_disponible, perfil_intencion_apartar, perfil_decisor_visita, perfil_vio_publicidad_redes, perfil_calificacion_lead",
    )
    .eq("id", prospectoId)
    .maybeSingle();

  if (prospectoError || !prospectoRow) {
    throw new Error("Prospecto no encontrado.");
  }

  const isLeadership = await isLeadershipAsesorId(asesorId);
  if (!isLeadership && prospectoRow.asesor_id !== asesorId) {
    throw new Error("Este prospecto no está asignado a ti.");
  }

  const validation = await validateAsesorForVisita(asesorId, prospectoRow.desarrollo_id as string);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const config = await getCrmPlaybookConfig(prospectoRow.desarrollo_id as string);
  if (!config?.enabled) {
    throw new Error("Playbook no activo para este desarrollo.");
  }

  const step = config.steps.find((item) => item.id === stepId);
  if (!step) {
    throw new Error("Paso de playbook no válido.");
  }

  if (PLAYBOOK_PERFILAMIENTO_VISITA_STEP_IDS.has(stepId)) {
    const partial = validatePerfilamientoVisitaPartialInput(perfilamientoVisita);
    const existing = readPerfilamientoVisitaFromProspecto(prospectoRow);
    const merged = mergePerfilamientoVisitaAnswers(existing, partial);
    const perfilCalificacionLead = computePerfilCalificacionLead(merged);
    const { error: perfilError } = await supabase
      .from("prospectos")
      .update({
        ...perfilamientoVisitaPartialToRow(partial),
        perfil_calificacion_lead: perfilCalificacionLead,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prospectoId);

    if (perfilError) {
      throw new Error(perfilError.message);
    }

    // Avance parcial: guarda respuestas sin marcar el paso como completo.
    if (!isPerfilamientoVisitaComplete(merged)) {
      const { data: fullProspecto, error: fullError } = await supabase
        .from("prospectos")
        .select("*")
        .eq("id", prospectoId)
        .maybeSingle();

      if (fullError || !fullProspecto) {
        throw new Error("No se pudo recargar el prospecto.");
      }

      const { data: cotizaciones } = await supabase
        .from("cotizaciones")
        .select("id")
        .eq("prospecto_id", prospectoId);

      const progressMap = await getPlaybookProgressMap([prospectoId]);
      const manualStepIds = progressMap.get(prospectoId) ?? [];
      const recorridoCompletado = await resolveRecorridoCompletadoForProspecto(
        fullProspecto as ProspectoListRow,
      );

      return {
        playbook: computeProspectoPlaybookState(
          fullProspecto as ProspectoListRow,
          config,
          manualStepIds,
          cotizaciones?.length ?? 0,
          recorridoCompletado,
        ),
        prospecto: fullProspecto as ProspectoListRow,
      };
    }
  }

  const visitDate = normalizePlaybookVisitDate(stepId, stepDate);
  const visitTime = normalizePlaybookVisitTime(stepId, stepTime);
  if (visitDate) {
    const dateField = stepId === "visita-agendada" ? "visita_agendada_on" : "visita_realizada_on";
    const patch: Record<string, string> = {
      [dateField]: visitDate,
      updated_at: new Date().toISOString(),
    };
    if (visitTime && stepId === "visita-agendada") {
      patch.visita_agendada_hora = visitTime;
    }
    const { error: dateError } = await supabase
      .from("prospectos")
      .update(patch)
      .eq("id", prospectoId);

    if (dateError) {
      throw new Error(dateError.message);
    }
  }

  const { error } = await supabase.from("prospecto_playbook_progress").upsert(
    {
      prospecto_id: prospectoId,
      step_id: stepId,
      completed_at: new Date().toISOString(),
      completed_by: asesorId,
    },
    { onConflict: "prospecto_id,step_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  await completeCadenciaTouchForPlaybookStep(prospectoId, stepId, asesorId);

  {
    const {
      isPlaybookFirstContactStep,
      recordFirstAdvisorContact,
      firstContactSourceFromPlaybookStep,
    } = await import("@/lib/comercial/speed-to-lead");
    if (isPlaybookFirstContactStep(stepId)) {
      await recordFirstAdvisorContact({
        prospectoId,
        desarrolloId: prospectoRow.desarrollo_id as string,
        source: firstContactSourceFromPlaybookStep(stepId),
        asesorId,
      });
    }
  }

  if (stepId === "visita-agendada") {
    await completeCadenciaForProspecto(prospectoId, "Visita agendada — cadencia detenida");
  }

  if (stepId === "recorrido") {
    // Pase / walk-in: la visita realizada cumple también la cita agendada.
    await supabase.from("prospecto_playbook_progress").upsert(
      {
        prospecto_id: prospectoId,
        step_id: "visita-agendada",
        completed_at: new Date().toISOString(),
        completed_by: asesorId,
      },
      { onConflict: "prospecto_id,step_id" },
    );

    if (visitDate) {
      const { data: datesRow } = await supabase
        .from("prospectos")
        .select("visita_agendada_on")
        .eq("id", prospectoId)
        .maybeSingle();
      if (!datesRow?.visita_agendada_on) {
        await supabase
          .from("prospectos")
          .update({
            visita_agendada_on: visitDate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", prospectoId);
      }
    }

    await completeCadenciaForProspecto(prospectoId, "Visita realizada — cadencia detenida");

    const currentEtapa =
      normalizeProspectoEtapaValue(prospectoRow.etapa as string) ?? ("nuevo" as ProspectoEtapa);
    const nextEtapa = mergeProspectoEtapa(currentEtapa, "visita");
    if (nextEtapa !== currentEtapa) {
      await supabase
        .from("prospectos")
        .update({ etapa: nextEtapa, updated_at: new Date().toISOString() })
        .eq("id", prospectoId);
    }
  }

  const { data: fullProspecto, error: fullError } = await supabase
    .from("prospectos")
    .select("*")
    .eq("id", prospectoId)
    .maybeSingle();

  if (fullError || !fullProspecto) {
    throw new Error("No se pudo recargar el prospecto.");
  }

  const { data: cotizaciones } = await supabase
    .from("cotizaciones")
    .select("id")
    .eq("prospecto_id", prospectoId);

  const progressMap = await getPlaybookProgressMap([prospectoId]);
  const manualStepIds = progressMap.get(prospectoId) ?? [];
  const recorridoCompletado = await resolveRecorridoCompletadoForProspecto(
    fullProspecto as ProspectoListRow,
  );

  return {
    playbook: computeProspectoPlaybookState(
      fullProspecto as ProspectoListRow,
      config,
      manualStepIds,
      cotizaciones?.length ?? 0,
      recorridoCompletado,
    ),
    prospecto: fullProspecto as ProspectoListRow,
  };
};

export const uncompletePlaybookStepForProspecto = async (
  asesorId: string,
  prospectoId: string,
  stepId: string,
): Promise<{ playbook: ProspectoPlaybookState; prospecto: ProspectoListRow }> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: prospectoRow, error: prospectoError } = await supabase
    .from("prospectos")
    .select("id, desarrollo_id, asesor_id")
    .eq("id", prospectoId)
    .maybeSingle();

  if (prospectoError || !prospectoRow) {
    throw new Error("Prospecto no encontrado.");
  }

  const isLeadership = await isLeadershipAsesorId(asesorId);
  if (!isLeadership && prospectoRow.asesor_id !== asesorId) {
    throw new Error("Este prospecto no está asignado a ti.");
  }

  const config = await getCrmPlaybookConfig(prospectoRow.desarrollo_id as string);
  if (!config?.enabled) {
    throw new Error("Playbook no activo para este desarrollo.");
  }

  const step = config.steps.find((item) => item.id === stepId);
  if (!step) {
    throw new Error("Paso de playbook no válido.");
  }

  if (PLAYBOOK_PERFILAMIENTO_VISITA_STEP_IDS.has(stepId)) {
    throw new Error("El perfilamiento se edita en el bloque de arriba.");
  }

  const legacyIds = normalizeLegacyPlaybookStepIds([stepId]);
  const { error } = await supabase
    .from("prospecto_playbook_progress")
    .delete()
    .eq("prospecto_id", prospectoId)
    .in("step_id", Array.from(new Set([stepId, ...legacyIds])));

  if (error) {
    throw new Error(error.message);
  }

  const { data: fullProspecto, error: fullError } = await supabase
    .from("prospectos")
    .select("*")
    .eq("id", prospectoId)
    .maybeSingle();

  if (fullError || !fullProspecto) {
    throw new Error("No se pudo recargar el prospecto.");
  }

  const { data: cotizaciones } = await supabase
    .from("cotizaciones")
    .select("id")
    .eq("prospecto_id", prospectoId);

  const progressMap = await getPlaybookProgressMap([prospectoId]);
  const manualStepIds = progressMap.get(prospectoId) ?? [];
  const recorridoCompletado = await resolveRecorridoCompletadoForProspecto(
    fullProspecto as ProspectoListRow,
  );

  return {
    playbook: computeProspectoPlaybookState(
      fullProspecto as ProspectoListRow,
      config,
      manualStepIds,
      cotizaciones?.length ?? 0,
      recorridoCompletado,
    ),
    prospecto: fullProspecto as ProspectoListRow,
  };
};

export const validatePlaybookEtapaChange = async (
  prospecto: ProspectoDetail,
  targetEtapa: ProspectoEtapa,
): Promise<void> => {
  const config = await getCrmPlaybookConfig(prospecto.desarrollo_id);
  if (!config?.enabled || !config.blockEtapa) {
    return;
  }

  const currentEtapa = isProspectoEtapa(prospecto.etapa) ? prospecto.etapa : "nuevo";
  const progressMap = await getPlaybookProgressMap([prospecto.id]);
  const manualStepIds = progressMap.get(prospecto.id) ?? [];
  const recorridoCompletado = await resolveRecorridoCompletadoForProspecto(prospecto);
  const autoIds = getAutoCompletedPlaybookStepIds(
    buildPlaybookSignals(prospecto, prospecto.cotizaciones.length, recorridoCompletado),
  );
  const completedIds = mergePlaybookProgress(manualStepIds, autoIds);

  const check = canAdvancePlaybookEtapa(config, currentEtapa, targetEtapa, completedIds);
  if (!check.ok) {
    throw new Error(
      `Completa el playbook antes de avanzar etapa: ${check.pending.map((step) => step.label).join(", ")}`,
    );
  }
};

export const getPlaybookQueueForAsesor = async (
  asesorId: string,
  desarrolloId: string,
): Promise<PlaybookQueueItem[]> => {
  const validation = await validateAsesorForVisita(asesorId, desarrolloId);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const config = await getCrmPlaybookConfig(desarrolloId);
  if (!config?.enabled) {
    return [];
  }

  const asesorFilter = await resolveProspectoAsesorFilter(asesorId);
  const prospectos = await listProspectos({
    desarrolloId,
    ...(asesorFilter ? { asesorId: asesorFilter } : {}),
    etapa: PROSPECTO_ETAPA_FILTER_EN_SEGUIMIENTO,
    fechaEn: "updated",
  });
  const active = prospectos.filter(
    (row) => isProspectoEtapa(row.etapa) && PLAYBOOK_ACTIVE_ETAPAS.has(row.etapa),
  );

  if (!active.length) {
    return [];
  }

  const ids = active.map((row) => row.id);
  const progressMap = await getPlaybookProgressMap(ids);
  const cotizacionMap = await getCotizacionCountMap(ids);
  const recorridoMap = await resolveRecorridoCompletadoMap(active);

  const queue: PlaybookQueueItem[] = [];

  for (const row of active) {
    const etapa = isProspectoEtapa(row.etapa) ? row.etapa : "nuevo";
    const manualStepIds = progressMap.get(row.id) ?? [];
    const autoIds = getAutoCompletedPlaybookStepIds(
      buildPlaybookSignals(row, cotizacionMap.get(row.id) ?? 0, recorridoMap.get(row.id) ?? false),
    );
    const completedIds = mergePlaybookProgress(manualStepIds, autoIds);
    const nextStep = getNextPlaybookStep(config, etapa, completedIds);
    const pendingRequired = getPendingRequiredForEtapa(config, etapa, completedIds).length;

    if (!nextStep && pendingRequired === 0) {
      continue;
    }

    queue.push({
      prospectoId: row.id,
      nombre: row.nombre,
      etapa,
      updatedAt: row.updated_at,
      nextStep,
      pendingRequired,
      priorityScore: scorePlaybookQueueItem(etapa, pendingRequired, row.updated_at),
    });
  }

  return queue.sort((a, b) => b.priorityScore - a.priorityScore);
};

export const formatPlaybookBlockMessage = (pending: PlaybookStep[]) =>
  `Completa el playbook antes de avanzar etapa: ${pending.map((step) => step.label).join(", ")}`;
