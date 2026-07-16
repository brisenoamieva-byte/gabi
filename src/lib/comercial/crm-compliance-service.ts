import type { AdminProfile } from "@/lib/admin/types";
import { listProspectos } from "@/lib/admin/prospectos-service";
import { resolveProspectoAsesorFilter } from "@/lib/asesores/leadership-access";
import type { ProspectoListRow } from "@/lib/admin/prospectos-service";
import {
  classifyPlaybookComplianceIssue,
  getAllPendingRequiredUpToEtapa,
  getAutoCompletedPlaybookStepIds,
  hasCompleteContactData,
  mergePlaybookProgress,
  type CrmPlaybookConfig,
  type PlaybookComplianceIssue,
} from "@/lib/comercial/crm-playbook";
import {
  getCotizacionCountMap,
  getCrmPlaybookConfig,
  getPlaybookProgressMap,
} from "@/lib/comercial/crm-playbook-service";
import { isProspectoEtapa, type ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";
import {
  getCompliancePauseThreshold,
  getComplianceRecorridoBlockThreshold,
  resolveComplianceGateLevel,
  type ComplianceGateLevel,
} from "@/lib/comercial/crm-compliance-config";
import {
  isPerfilamientoVisitaComplete,
  readPerfilamientoVisitaFromProspecto,
} from "@/lib/comercial/perfilamiento-post-visita";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const COMPLIANCE_ACTIVE_ETAPAS = new Set<ProspectoEtapa>([
  "nuevo",
  "contactado",
  "cita",
]);

export type ProspectoComplianceRow = {
  prospectoId: string;
  nombre: string;
  etapa: ProspectoEtapa;
  asesorId: string | null;
  asesorNombre: string | null;
  createdAt: string;
  updatedAt: string;
  issues: PlaybookComplianceIssue[];
  overdueCount: number;
  pendingCount: number;
  isCompliant: boolean;
  confidencePct: number;
  excludedFromPipeline: boolean;
};

export type AsesorComplianceSummary = {
  asesorId: string;
  asesorNombre: string;
  activeLeads: number;
  compliantLeads: number;
  overdueIssues: number;
  pendingIssues: number;
  compliancePct: number;
  confidencePct: number;
};

export type DesarrolloComplianceReport = {
  desarrolloId: string;
  playbookEnabled: boolean;
  activeLeads: number;
  compliantLeads: number;
  compliancePct: number;
  confidencePct: number;
  overdueCount: number;
  exceptionCount: number;
  pipelineReliableCount: number;
  pipelineExcludedCount: number;
  asesores: AsesorComplianceSummary[];
  exceptions: ProspectoComplianceRow[];
  generatedAt: string;
};

const buildPlaybookSignals = (prospecto: ProspectoListRow, cotizacionesCount = 0) => ({
  etapa: prospecto.etapa,
  email: prospecto.email,
  telefono: prospecto.telefono,
  notas: prospecto.notas,
  recorridoCompletado: false,
  cotizacionesCount,
  perfilamientoCompleto: isPerfilamientoVisitaComplete(
    readPerfilamientoVisitaFromProspecto(prospecto),
  ),
});

const computeProspectoConfidencePct = (
  prospecto: ProspectoListRow,
  issues: PlaybookComplianceIssue[],
): number => {
  const hasContact = hasCompleteContactData(prospecto.email, prospecto.telefono);
  const overdueCount = issues.filter((item) => item.status === "overdue").length;

  if (overdueCount > 0) {
    return 0;
  }

  if (!hasContact) {
    return 40;
  }

  if (issues.length > 0) {
    return 70;
  }

  return 100;
};

export const evaluateProspectoCompliance = (
  prospecto: ProspectoListRow,
  config: CrmPlaybookConfig,
  manualStepIds: string[],
  cotizacionesCount = 0,
): ProspectoComplianceRow => {
  const etapa = isProspectoEtapa(prospecto.etapa) ? prospecto.etapa : "nuevo";
  const autoIds = getAutoCompletedPlaybookStepIds(
    buildPlaybookSignals(prospecto, cotizacionesCount),
  );
  const completedIds = mergePlaybookProgress(manualStepIds, autoIds);
  const pendingSteps = getAllPendingRequiredUpToEtapa(config, etapa, completedIds);
  const issues = pendingSteps.map((step) =>
    classifyPlaybookComplianceIssue(step, prospecto),
  );

  const overdueCount = issues.filter((item) => item.status === "overdue").length;
  const pendingCount = issues.filter((item) => item.status === "pending").length;
  const confidencePct = computeProspectoConfidencePct(prospecto, issues);

  return {
    prospectoId: prospecto.id,
    nombre: prospecto.nombre,
    etapa,
    asesorId: prospecto.asesor_id,
    asesorNombre: prospecto.asesorNombre,
    createdAt: prospecto.created_at,
    updatedAt: prospecto.updated_at,
    issues,
    overdueCount,
    pendingCount,
    isCompliant: overdueCount === 0,
    confidencePct,
    excludedFromPipeline: confidencePct < 70,
  };
};

const aggregateAsesorSummaries = (
  rows: ProspectoComplianceRow[],
): AsesorComplianceSummary[] => {
  const map = new Map<string, AsesorComplianceSummary>();

  for (const row of rows) {
    const asesorId = row.asesorId ?? "sin-asesor";
    const asesorNombre = row.asesorNombre ?? "Sin asesor";
    const existing = map.get(asesorId) ?? {
      asesorId,
      asesorNombre,
      activeLeads: 0,
      compliantLeads: 0,
      overdueIssues: 0,
      pendingIssues: 0,
      compliancePct: 0,
      confidencePct: 0,
    };

    existing.activeLeads += 1;
    if (row.isCompliant) {
      existing.compliantLeads += 1;
    }
    existing.overdueIssues += row.overdueCount;
    existing.pendingIssues += row.pendingCount;
    existing.confidencePct += row.confidencePct;
    map.set(asesorId, existing);
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      compliancePct:
        item.activeLeads > 0 ? Math.round((item.compliantLeads / item.activeLeads) * 100) : 100,
      confidencePct:
        item.activeLeads > 0 ? Math.round(item.confidencePct / item.activeLeads) : 100,
    }))
    .sort((a, b) => a.compliancePct - b.compliancePct || b.overdueIssues - a.overdueIssues);
};

export const getDesarrolloComplianceReport = async (
  desarrolloId: string,
  profile?: AdminProfile,
): Promise<DesarrolloComplianceReport> => {
  const config = await getCrmPlaybookConfig(desarrolloId);
  const generatedAt = new Date().toISOString();

  if (!config?.enabled) {
    return {
      desarrolloId,
      playbookEnabled: false,
      activeLeads: 0,
      compliantLeads: 0,
      compliancePct: 100,
      confidencePct: 100,
      overdueCount: 0,
      exceptionCount: 0,
      pipelineReliableCount: 0,
      pipelineExcludedCount: 0,
      asesores: [],
      exceptions: [],
      generatedAt,
    };
  }

  const prospectos = await listProspectos({ desarrolloId }, profile);
  const active = prospectos.filter(
    (row) => isProspectoEtapa(row.etapa) && COMPLIANCE_ACTIVE_ETAPAS.has(row.etapa),
  );

  if (!active.length) {
    return {
      desarrolloId,
      playbookEnabled: true,
      activeLeads: 0,
      compliantLeads: 0,
      compliancePct: 100,
      confidencePct: 100,
      overdueCount: 0,
      exceptionCount: 0,
      pipelineReliableCount: 0,
      pipelineExcludedCount: 0,
      asesores: [],
      exceptions: [],
      generatedAt,
    };
  }

  const ids = active.map((row) => row.id);
  const progressMap = await getPlaybookProgressMap(ids);
  const cotizacionMap = await getCotizacionCountMap(ids);

  const evaluated = active.map((row) =>
    evaluateProspectoCompliance(
      row,
      config,
      progressMap.get(row.id) ?? [],
      cotizacionMap.get(row.id) ?? 0,
    ),
  );

  const exceptions = evaluated
    .filter((row) => row.issues.length > 0)
    .sort(
      (a, b) =>
        b.overdueCount - a.overdueCount ||
        b.pendingCount - a.pendingCount ||
        a.confidencePct - b.confidencePct,
    );

  const compliantLeads = evaluated.filter((row) => row.isCompliant).length;
  const overdueCount = evaluated.reduce((sum, row) => sum + row.overdueCount, 0);
  const pipelineReliableCount = evaluated.filter((row) => !row.excludedFromPipeline).length;
  const pipelineExcludedCount = evaluated.length - pipelineReliableCount;
  const confidenceSum = evaluated.reduce((sum, row) => sum + row.confidencePct, 0);

  return {
    desarrolloId,
    playbookEnabled: true,
    activeLeads: evaluated.length,
    compliantLeads,
    compliancePct:
      evaluated.length > 0 ? Math.round((compliantLeads / evaluated.length) * 100) : 100,
    confidencePct:
      evaluated.length > 0 ? Math.round(confidenceSum / evaluated.length) : 100,
    overdueCount,
    exceptionCount: exceptions.length,
    pipelineReliableCount,
    pipelineExcludedCount,
    asesores: aggregateAsesorSummaries(evaluated),
    exceptions,
    generatedAt,
  };
};

export const getAsesorComplianceSummary = async (
  asesorId: string,
  desarrolloId: string,
): Promise<{
  compliancePct: number;
  confidencePct: number;
  overdueCount: number;
  pendingCount: number;
  exceptionCount: number;
  topExceptions: ProspectoComplianceRow[];
}> => {
  const config = await getCrmPlaybookConfig(desarrolloId);

  if (!config?.enabled) {
    return {
      compliancePct: 100,
      confidencePct: 100,
      overdueCount: 0,
      pendingCount: 0,
      exceptionCount: 0,
      topExceptions: [],
    };
  }

  const asesorFilter = await resolveProspectoAsesorFilter(asesorId);
  const prospectos = await listProspectos({
    desarrolloId,
    ...(asesorFilter ? { asesorId: asesorFilter } : {}),
  });
  const active = prospectos.filter(
    (row) => isProspectoEtapa(row.etapa) && COMPLIANCE_ACTIVE_ETAPAS.has(row.etapa),
  );

  if (!active.length) {
    return {
      compliancePct: 100,
      confidencePct: 100,
      overdueCount: 0,
      pendingCount: 0,
      exceptionCount: 0,
      topExceptions: [],
    };
  }

  const ids = active.map((row) => row.id);
  const progressMap = await getPlaybookProgressMap(ids);
  const cotizacionMap = await getCotizacionCountMap(ids);

  const evaluated = active.map((row) =>
    evaluateProspectoCompliance(
      row,
      config,
      progressMap.get(row.id) ?? [],
      cotizacionMap.get(row.id) ?? 0,
    ),
  );

  const exceptions = evaluated
    .filter((row) => row.issues.length > 0)
    .sort((a, b) => b.overdueCount - a.overdueCount || b.pendingCount - a.pendingCount);

  const compliantLeads = evaluated.filter((row) => row.isCompliant).length;
  const overdueCount = evaluated.reduce((sum, row) => sum + row.overdueCount, 0);
  const pendingCount = evaluated.reduce((sum, row) => sum + row.pendingCount, 0);
  const confidenceSum = evaluated.reduce((sum, row) => sum + row.confidencePct, 0);

  return {
    compliancePct:
      evaluated.length > 0 ? Math.round((compliantLeads / evaluated.length) * 100) : 100,
    confidencePct:
      evaluated.length > 0 ? Math.round(confidenceSum / evaluated.length) : 100,
    overdueCount,
    pendingCount,
    exceptionCount: exceptions.length,
    topExceptions: exceptions.slice(0, 8),
  };
};

export type ComplianceDigestTarget = {
  asesorId: string;
  asesorNombre: string;
  email: string;
  desarrolloId: string;
  overdueCount: number;
  pendingCount: number;
  exceptionCount: number;
  topExceptions: ProspectoComplianceRow[];
};

export const listComplianceDigestTargets = async (
  desarrolloId: string,
): Promise<ComplianceDigestTarget[]> => {
  const config = await getCrmPlaybookConfig(desarrolloId);
  if (!config?.enabled) {
    return [];
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data: asesores } = await supabase
    .from("asesores")
    .select("id, nombre, email, activo, desarrollos_ids")
    .eq("activo", true)
    .contains("desarrollos_ids", [desarrolloId]);

  if (!asesores?.length) {
    return [];
  }

  const targets: ComplianceDigestTarget[] = [];

  for (const asesor of asesores) {
    const summary = await getAsesorComplianceSummary(asesor.id as string, desarrolloId);
    if (summary.exceptionCount === 0) {
      continue;
    }

    targets.push({
      asesorId: asesor.id as string,
      asesorNombre: asesor.nombre as string,
      email: asesor.email as string,
      desarrolloId,
      overdueCount: summary.overdueCount,
      pendingCount: summary.pendingCount,
      exceptionCount: summary.exceptionCount,
      topExceptions: summary.topExceptions,
    });
  }

  return targets;
};

export const getRecorridoComplianceGate = async (
  asesorId: string,
  desarrolloId: string,
): Promise<{
  playbookEnabled: boolean;
  overdueCount: number;
  pendingCount: number;
  threshold: number;
  pauseThreshold: number;
  level: ComplianceGateLevel;
  shouldBlock: boolean;
  allowContinue: boolean;
  message: string;
  title: string;
  topExceptions: ProspectoComplianceRow[];
}> => {
  const threshold = getComplianceRecorridoBlockThreshold();
  const pauseThreshold = getCompliancePauseThreshold();
  const summary = await getAsesorComplianceSummary(asesorId, desarrolloId);
  const config = await getCrmPlaybookConfig(desarrolloId);
  const playbookEnabled = Boolean(config?.enabled);

  if (!playbookEnabled) {
    return {
      playbookEnabled: false,
      overdueCount: 0,
      pendingCount: 0,
      threshold,
      pauseThreshold,
      level: "ok",
      shouldBlock: false,
      allowContinue: true,
      message: "",
      title: "",
      topExceptions: [],
    };
  }

  const level = resolveComplianceGateLevel(summary.overdueCount);
  const shouldBlock = level === "pause";
  const allowContinue = level !== "pause";

  let title = "";
  let message = "";
  if (level === "nudge") {
    title = "Un toque a tu pipeline";
    message = `Tienes ${summary.overdueCount} seguimiento(s) vencido(s). Dos minutos en Mis prospectos protegen tu comisión — luego sigues con el recorrido.`;
  } else if (level === "coach") {
    title = "Ordena tu CRM y sigue vendiendo";
    message = `Llevas ${summary.overdueCount} paso(s) vencido(s). Atiende 1 o 2 leads clave (WhatsApp rápido) y regresas. Tu embudo es tu ingreso.`;
  } else if (level === "pause") {
    title = "Pausa breve: limpia vencidos";
    message = `Hay ${summary.overdueCount} seguimientos vencidos (umbral ${pauseThreshold}). Cierra los más urgentes en Mis prospectos; el recorrido y cotizador nuevos se liberan al bajar de ${pauseThreshold}. Mis prospectos siempre está abierto.`;
  }

  return {
    playbookEnabled: true,
    overdueCount: summary.overdueCount,
    pendingCount: summary.pendingCount,
    threshold,
    pauseThreshold,
    level,
    shouldBlock,
    allowContinue,
    message,
    title,
    topExceptions: summary.topExceptions.slice(0, 5),
  };
};

export const getProspectoCompliance = async (
  prospecto: ProspectoListRow,
): Promise<ProspectoComplianceRow | null> => {
  const config = await getCrmPlaybookConfig(prospecto.desarrollo_id);
  if (!config?.enabled) {
    return null;
  }

  const progressMap = await getPlaybookProgressMap([prospecto.id]);
  const cotizacionMap = await getCotizacionCountMap([prospecto.id]);

  return evaluateProspectoCompliance(
    prospecto,
    config,
    progressMap.get(prospecto.id) ?? [],
    cotizacionMap.get(prospecto.id) ?? 0,
  );
};

export const wasComplianceDigestSentToday = async (
  desarrolloId: string,
  recipientType: "asesor" | "gerente",
  recipientId: string,
  channel: "email" | "whatsapp" = "email",
): Promise<boolean> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return false;
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("compliance_digest_log")
    .select("id", { count: "exact", head: true })
    .eq("desarrollo_id", desarrolloId)
    .eq("recipient_type", recipientType)
    .eq("recipient_id", recipientId)
    .eq("channel", channel)
    .gte("sent_at", startOfDay.toISOString());

  if (error) {
    return false;
  }

  return (count ?? 0) > 0;
};

export const logComplianceDigestSent = async (input: {
  desarrolloId: string;
  recipientType: "asesor" | "gerente";
  recipientId: string;
  email: string;
  overdueCount: number;
  exceptionCount: number;
  status: "sent" | "failed" | "skipped";
  channel?: "email" | "whatsapp";
  errorMessage?: string;
}): Promise<void> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  await supabase.from("compliance_digest_log").insert({
    desarrollo_id: input.desarrolloId,
    recipient_type: input.recipientType,
    recipient_id: input.recipientId,
    email: input.email,
    overdue_count: input.overdueCount,
    exception_count: input.exceptionCount,
    status: input.status,
    channel: input.channel ?? "email",
    error_message: input.errorMessage ?? null,
  });
};
