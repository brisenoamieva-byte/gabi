import type { DesarrolloCadenciaReport } from "@/lib/comercial/cadencia-service";
import type {
  AsesorComplianceSummary,
  DesarrolloComplianceReport,
  ProspectoComplianceRow,
} from "@/lib/comercial/crm-compliance-service";

/** Estado de un compromiso SLA frente al cliente. */
export type SlaStatus = "met" | "at_risk" | "breached" | "unavailable";

export type SlaCheckId =
  | "playbook_compliance"
  | "data_confidence"
  | "pipeline_reliability"
  | "zero_critical_overdue"
  | "cadencia_overdue";

export type SlaCheck = {
  id: SlaCheckId;
  label: string;
  promise: string;
  targetLabel: string;
  actualLabel: string;
  actualValue: number;
  targetValue: number;
  unit: "pct" | "count";
  status: SlaStatus;
  detail: string;
};

export type GarantiaSeal = "verde" | "riesgo" | "rojo" | "inactivo";

export type GarantiaSlaReport = {
  desarrolloId: string;
  playbookEnabled: boolean;
  seal: GarantiaSeal;
  sealLabel: string;
  sealMessage: string;
  /** % de checks aplicables en met (at_risk cuenta parcial). */
  garantiaScorePct: number;
  checks: SlaCheck[];
  compliance: Pick<
    DesarrolloComplianceReport,
    | "activeLeads"
    | "compliantLeads"
    | "compliancePct"
    | "confidencePct"
    | "overdueCount"
    | "exceptionCount"
    | "pipelineReliableCount"
    | "pipelineExcludedCount"
  >;
  cadencia: {
    overdueTouchesTotal: number;
    dueTodayTotal: number;
    activeCount: number;
    expiredCount: number;
    responseRatePct: number;
  } | null;
  asesores: AsesorComplianceSummary[];
  topExceptions: ProspectoComplianceRow[];
  generatedAt: string;
};

/** Compromisos comerciales por defecto (plan Garantía). */
export const GARANTIA_SLA_TARGETS = {
  /** % leads activos sin pasos vencidos */
  playbookComplianceMinPct: 95,
  /** Umbral “en riesgo” de cumplimiento */
  playbookComplianceRiskPct: 85,
  /** Confianza promedio de datos / playbook */
  confidenceMinPct: 80,
  confidenceRiskPct: 70,
  /** % del pipeline activo considerado confiable */
  pipelineReliableMinPct: 90,
  pipelineReliableRiskPct: 75,
  /** Pasos vencidos totales permitidos (0 = garantía estricta) */
  maxCriticalOverdue: 0,
  overdueRiskMax: 5,
  /** Toques de cadencia vencidos permitidos */
  maxCadenciaOverdue: 0,
  cadenciaOverdueRiskMax: 10,
} as const;

const statusForHigherIsBetter = (
  actual: number,
  metMin: number,
  riskMin: number,
): SlaStatus => {
  if (actual >= metMin) return "met";
  if (actual >= riskMin) return "at_risk";
  return "breached";
};

const statusForLowerIsBetter = (
  actual: number,
  metMax: number,
  riskMax: number,
): SlaStatus => {
  if (actual <= metMax) return "met";
  if (actual <= riskMax) return "at_risk";
  return "breached";
};

const scoreFromStatus = (status: SlaStatus): number => {
  if (status === "met") return 100;
  if (status === "at_risk") return 50;
  if (status === "breached") return 0;
  return 0;
};

export const buildGarantiaSlaReport = (
  compliance: DesarrolloComplianceReport,
  cadencia: DesarrolloCadenciaReport | null,
): GarantiaSlaReport => {
  const t = GARANTIA_SLA_TARGETS;
  const checks: SlaCheck[] = [];

  if (!compliance.playbookEnabled) {
    return {
      desarrolloId: compliance.desarrolloId,
      playbookEnabled: false,
      seal: "inactivo",
      sealLabel: "Playbook inactivo",
      sealMessage:
        "Activa el playbook CRM para medir la garantía de seguimiento. Sin playbook no hay SLA que auditar.",
      garantiaScorePct: 0,
      checks: [],
      compliance: {
        activeLeads: compliance.activeLeads,
        compliantLeads: compliance.compliantLeads,
        compliancePct: compliance.compliancePct,
        confidencePct: compliance.confidencePct,
        overdueCount: compliance.overdueCount,
        exceptionCount: compliance.exceptionCount,
        pipelineReliableCount: compliance.pipelineReliableCount,
        pipelineExcludedCount: compliance.pipelineExcludedCount,
      },
      cadencia: cadencia
        ? {
            overdueTouchesTotal: cadencia.overdueTouchesTotal,
            dueTodayTotal: cadencia.dueTodayTotal,
            activeCount: cadencia.activeCount,
            expiredCount: cadencia.expiredCount,
            responseRatePct: cadencia.responseRatePct,
          }
        : null,
      asesores: compliance.asesores,
      topExceptions: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const pipelineReliablePct =
    compliance.activeLeads > 0
      ? Math.round((compliance.pipelineReliableCount / compliance.activeLeads) * 100)
      : 100;

  checks.push({
    id: "playbook_compliance",
    label: "Playbook al día",
    promise: "≥95% de leads activos sin pasos vencidos",
    targetLabel: `≥ ${t.playbookComplianceMinPct}%`,
    actualLabel: `${compliance.compliancePct}%`,
    actualValue: compliance.compliancePct,
    targetValue: t.playbookComplianceMinPct,
    unit: "pct",
    status: statusForHigherIsBetter(
      compliance.compliancePct,
      t.playbookComplianceMinPct,
      t.playbookComplianceRiskPct,
    ),
    detail: `${compliance.compliantLeads} de ${compliance.activeLeads} leads sin vencidos`,
  });

  checks.push({
    id: "data_confidence",
    label: "Calidad de datos",
    promise: "Contacto y playbook con confianza promedio ≥80%",
    targetLabel: `≥ ${t.confidenceMinPct}%`,
    actualLabel: `${compliance.confidencePct}%`,
    actualValue: compliance.confidencePct,
    targetValue: t.confidenceMinPct,
    unit: "pct",
    status: statusForHigherIsBetter(
      compliance.confidencePct,
      t.confidenceMinPct,
      t.confidenceRiskPct,
    ),
    detail: "Promedio de confianza por lead activo",
  });

  checks.push({
    id: "pipeline_reliability",
    label: "Pipeline confiable",
    promise: "≥90% del embudo usable para decisiones",
    targetLabel: `≥ ${t.pipelineReliableMinPct}%`,
    actualLabel: `${pipelineReliablePct}%`,
    actualValue: pipelineReliablePct,
    targetValue: t.pipelineReliableMinPct,
    unit: "pct",
    status: statusForHigherIsBetter(
      pipelineReliablePct,
      t.pipelineReliableMinPct,
      t.pipelineReliableRiskPct,
    ),
    detail: `${compliance.pipelineReliableCount} confiables · ${compliance.pipelineExcludedCount} excluidos`,
  });

  checks.push({
    id: "zero_critical_overdue",
    label: "Cero pasos críticos vencidos",
    promise: "0 pasos de playbook vencidos en el desarrollo",
    targetLabel: `≤ ${t.maxCriticalOverdue}`,
    actualLabel: String(compliance.overdueCount),
    actualValue: compliance.overdueCount,
    targetValue: t.maxCriticalOverdue,
    unit: "count",
    status: statusForLowerIsBetter(
      compliance.overdueCount,
      t.maxCriticalOverdue,
      t.overdueRiskMax,
    ),
    detail: `${compliance.exceptionCount} lead(s) con excepciones`,
  });

  if (cadencia) {
    checks.push({
      id: "cadencia_overdue",
      label: "Cadencia de contacto",
      promise: "0 toques de la cadencia 8 días vencidos",
      targetLabel: `≤ ${t.maxCadenciaOverdue}`,
      actualLabel: String(cadencia.overdueTouchesTotal),
      actualValue: cadencia.overdueTouchesTotal,
      targetValue: t.maxCadenciaOverdue,
      unit: "count",
      status: statusForLowerIsBetter(
        cadencia.overdueTouchesTotal,
        t.maxCadenciaOverdue,
        t.cadenciaOverdueRiskMax,
      ),
      detail: `${cadencia.dueTodayTotal} para hoy · ${cadencia.activeCount} cadencias activas`,
    });
  }

  const applicable = checks.filter((c) => c.status !== "unavailable");
  const garantiaScorePct = applicable.length
    ? Math.round(
        applicable.reduce((sum, c) => sum + scoreFromStatus(c.status), 0) / applicable.length,
      )
    : 0;

  const anyBreached = applicable.some((c) => c.status === "breached");
  const anyRisk = applicable.some((c) => c.status === "at_risk");

  let seal: GarantiaSeal = "verde";
  let sealLabel = "Garantía en verde";
  let sealMessage =
    "El desarrollo cumple el SLA de seguimiento. Listo para mostrar al dueño del proyecto.";

  if (anyBreached) {
    seal = "rojo";
    sealLabel = "Fuera de SLA";
    sealMessage =
      "Hay compromisos incumplidos. Gerencia debe intervenir hoy: excepciones y asesores abajo.";
  } else if (anyRisk) {
    seal = "riesgo";
    sealLabel = "En riesgo";
    sealMessage =
      "Aún dentro de tolerancia, pero cerca del límite. Prioriza excepciones antes del cierre del día.";
  }

  const topExceptions = [...compliance.exceptions]
    .sort((a, b) => b.overdueCount - a.overdueCount || b.pendingCount - a.pendingCount)
    .slice(0, 25);

  return {
    desarrolloId: compliance.desarrolloId,
    playbookEnabled: true,
    seal,
    sealLabel,
    sealMessage,
    garantiaScorePct,
    checks,
    compliance: {
      activeLeads: compliance.activeLeads,
      compliantLeads: compliance.compliantLeads,
      compliancePct: compliance.compliancePct,
      confidencePct: compliance.confidencePct,
      overdueCount: compliance.overdueCount,
      exceptionCount: compliance.exceptionCount,
      pipelineReliableCount: compliance.pipelineReliableCount,
      pipelineExcludedCount: compliance.pipelineExcludedCount,
    },
    cadencia: cadencia
      ? {
          overdueTouchesTotal: cadencia.overdueTouchesTotal,
          dueTodayTotal: cadencia.dueTodayTotal,
          activeCount: cadencia.activeCount,
          expiredCount: cadencia.expiredCount,
          responseRatePct: cadencia.responseRatePct,
        }
      : null,
    asesores: compliance.asesores,
    topExceptions,
    generatedAt: new Date().toISOString(),
  };
};
