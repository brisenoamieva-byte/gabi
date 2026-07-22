/**
 * AsesorScore — scorecard de desempeño comercial (v2026.2)
 *
 * Diseño basado en prácticas CRM premium / RevOps:
 * - No rankear solo por volumen: tasas normalizadas por carga.
 * - Separar resultado (contacto + avance de funnel) de proceso (playbook + cadencia).
 * - Incluir speed-to-lead real (first_contacted_at) y calidad de cartera (iScore).
 * - Muestra mínima antes de etiquetar banda (evita sesgo con n pequeño).
 * - Spam/duplicados fuera del denominador (ruido de captación ≠ skill del asesor).
 *
 * Referencias: speed-to-lead <5–60 min, lead→cita→cierre, SLA/playbook, cadencia 8 días.
 */

import type { AdminProfile } from "@/lib/admin/types";
import { listProspectos, type ProspectoListRow } from "@/lib/admin/prospectos-service";
import {
  getDesarrolloCadenciaReport,
  type AsesorCadenciaSummary,
  type DesarrolloCadenciaReport,
} from "@/lib/comercial/cadencia-service";
import {
  getDesarrolloComplianceReport,
  type AsesorComplianceSummary,
  type DesarrolloComplianceReport,
} from "@/lib/comercial/crm-compliance-service";
import {
  isProspectoEtapa,
  normalizeProspectoEtapaValue,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";
import {
  aggregateSpeedToLead,
  formatSpeedMinutesLabel,
  speedMinutesBetween,
  type SpeedToLeadAggregate,
} from "@/lib/comercial/speed-to-lead";

export const ASESOR_SCORE_VERSION = "2026.2";

/** Pesos base (suman 1). Si falta un componente, se redistribuye. */
export const ASESOR_SCORE_WEIGHTS = {
  contact: 0.25,
  speed: 0.15,
  funnel: 0.15,
  compliance: 0.2,
  cadencia: 0.15,
  quality: 0.1,
} as const;

export type AsesorScoreWeightKey = keyof typeof ASESOR_SCORE_WEIGHTS;

/** Muestra mínima para bandear con confianza. */
export const ASESOR_SCORE_MIN_SAMPLE = 5;

/** iScore máximo teórico (lead-scoring.ts). */
export const ISCORE_MAX = 30;

/** Ventana por defecto del reporte (días hacia atrás desde hoy). */
export const ASESOR_SCORECARD_DEFAULT_DAYS = 90;

export type AsesorScoreBand =
  | "elite"
  | "solido"
  | "riesgo"
  | "critico"
  | "insuficiente";

export const asesorScoreBandLabel: Record<AsesorScoreBand, string> = {
  elite: "Élite",
  solido: "Sólido",
  riesgo: "En riesgo",
  critico: "Crítico",
  insuficiente: "Muestra insuficiente",
};

const CONTACT_ETAPAS = new Set<ProspectoEtapa>([
  "contactado",
  "cita",
  "visita",
  "apartado",
  "vendido",
]);

/** Avance comercial más allá del primer contacto (cita+). */
const FUNNEL_ETAPAS = new Set<ProspectoEtapa>([
  "cita",
  "visita",
  "apartado",
  "vendido",
]);

const DISCARD_ETAPAS = new Set<ProspectoEtapa>(["perdido", "cancelado"]);

const clampPct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const pct = (num: number, den: number) => (den > 0 ? clampPct((num / den) * 100) : 0);

const resolveEtapa = (raw: string): ProspectoEtapa | null =>
  normalizeProspectoEtapaValue(raw) ?? (isProspectoEtapa(raw) ? raw : null);

export const bandFromScore = (score: number, sampleSize: number): AsesorScoreBand => {
  if (sampleSize < ASESOR_SCORE_MIN_SAMPLE) {
    return "insuficiente";
  }
  if (score >= 80) return "elite";
  if (score >= 65) return "solido";
  if (score >= 50) return "riesgo";
  return "critico";
};

export type AsesorScoreParts = {
  contactRatePct: number;
  funnelRatePct: number;
  /** null = sin first_contacted_at en muestra → redistribuir. */
  speedScorePct: number | null;
  /** null = playbook off o sin cartera activa → redistribuir peso. */
  compliancePct: number | null;
  /** null = sin cadencias → redistribuir peso. */
  cadenciaHealthPct: number | null;
  /** avg(iScore) / ISCORE_MAX * 100. */
  qualityPct: number;
};

export type AsesorScoreBreakdown = {
  score: number;
  band: AsesorScoreBand;
  weightsUsed: Partial<Record<AsesorScoreWeightKey, number>>;
  parts: AsesorScoreParts;
};

/**
 * Compone 0–100. Si speed/compliance/cadencia no aplican, redistribuye su peso
 * proporcionalmente entre los componentes disponibles.
 */
export const computeAsesorScore = (
  parts: AsesorScoreParts,
  sampleSize: number,
): AsesorScoreBreakdown => {
  const available: { key: AsesorScoreWeightKey; weight: number; value: number }[] = [
    { key: "contact", weight: ASESOR_SCORE_WEIGHTS.contact, value: parts.contactRatePct },
    { key: "funnel", weight: ASESOR_SCORE_WEIGHTS.funnel, value: parts.funnelRatePct },
    { key: "quality", weight: ASESOR_SCORE_WEIGHTS.quality, value: parts.qualityPct },
  ];

  if (parts.speedScorePct !== null) {
    available.push({
      key: "speed",
      weight: ASESOR_SCORE_WEIGHTS.speed,
      value: parts.speedScorePct,
    });
  }
  if (parts.compliancePct !== null) {
    available.push({
      key: "compliance",
      weight: ASESOR_SCORE_WEIGHTS.compliance,
      value: parts.compliancePct,
    });
  }
  if (parts.cadenciaHealthPct !== null) {
    available.push({
      key: "cadencia",
      weight: ASESOR_SCORE_WEIGHTS.cadencia,
      value: parts.cadenciaHealthPct,
    });
  }

  const weightSum = available.reduce((sum, row) => sum + row.weight, 0);
  const weightsUsed: Partial<Record<AsesorScoreWeightKey, number>> = {};
  let score = 0;

  for (const row of available) {
    const w = weightSum > 0 ? row.weight / weightSum : 0;
    weightsUsed[row.key] = Math.round(w * 1000) / 1000;
    score += row.value * w;
  }

  const rounded = clampPct(score);
  return {
    score: rounded,
    band: bandFromScore(rounded, sampleSize),
    weightsUsed,
    parts,
  };
};

/** Salud de cadencia por asesor: penaliza vencidos vs cadencias activas. */
export const cadenciaHealthFromSummary = (
  row: AsesorCadenciaSummary | undefined,
): number | null => {
  if (!row || row.activeCadencias <= 0) {
    return null;
  }
  const overdueRatio = row.overdueToday / row.activeCadencias;
  return clampPct(100 - overdueRatio * 80);
};

export type AsesorScorecardRow = {
  asesorId: string;
  asesorNombre: string;
  assignedCount: number;
  contactedCount: number;
  funnelCount: number;
  discardedCount: number;
  nuevoCount: number;
  contactRatePct: number;
  funnelRatePct: number;
  discardRatePct: number;
  avgIscore: number | null;
  qualityPct: number;
  /** Mediana de minutos al primer toque (null si sin cobertura). */
  speedMedianMinutes: number | null;
  speedUnder60Pct: number;
  speedCoveragePct: number;
  speedScorePct: number | null;
  compliancePct: number | null;
  cadenciaHealthPct: number | null;
  overdueCadencia: number;
  loadSharePct: number;
  score: number;
  band: AsesorScoreBand;
  weightsUsed: Partial<Record<AsesorScoreWeightKey, number>>;
  sampleReliable: boolean;
};

export type CanalScorecardRow = {
  canal: string;
  leads: number;
  contactedCount: number;
  contactRatePct: number;
  funnelCount: number;
  funnelRatePct: number;
  avgIscore: number | null;
};

export type CampanaScorecardRow = {
  campanaId: string | null;
  campanaNombre: string;
  canal: string;
  leads: number;
  contactedCount: number;
  contactRatePct: number;
  funnelCount: number;
  funnelRatePct: number;
};

export type DesarrolloScorecardKpis = {
  totalLeads: number;
  assignedLeads: number;
  unassignedLeads: number;
  contactRatePct: number;
  funnelRatePct: number;
  discardRatePct: number;
  /** % aún en etapa nuevo (estancamiento). */
  nuevoRatePct: number;
  avgIscore: number | null;
  asesoresActivos: number;
  /** Promedio simple de scores de asesores con muestra confiable. */
  avgScoreReliable: number | null;
  speed: SpeedToLeadAggregate;
};

export type DesarrolloAsesorScorecardReport = {
  desarrolloId: string;
  version: typeof ASESOR_SCORE_VERSION;
  desde: string;
  hasta: string;
  playbookEnabled: boolean;
  kpis: DesarrolloScorecardKpis;
  asesores: AsesorScorecardRow[];
  canales: CanalScorecardRow[];
  campanas: CampanaScorecardRow[];
  generatedAt: string;
};

export type ScorecardPeriod = {
  desde: string;
  hasta: string;
};

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

export const defaultScorecardPeriod = (
  days = ASESOR_SCORECARD_DEFAULT_DAYS,
  now = new Date(),
): ScorecardPeriod => {
  const hasta = toDateInput(now);
  const desdeDate = new Date(now);
  desdeDate.setUTCDate(desdeDate.getUTCDate() - days);
  return { desde: toDateInput(desdeDate), hasta };
};

type AggBucket = {
  asesorId: string;
  asesorNombre: string;
  assigned: number;
  contacted: number;
  funnel: number;
  discarded: number;
  nuevo: number;
  iscoreSum: number;
  iscoreCount: number;
  speedMinutes: number[];
};

const emptyBucket = (asesorId: string, asesorNombre: string): AggBucket => ({
  asesorId,
  asesorNombre,
  assigned: 0,
  contacted: 0,
  funnel: 0,
  discarded: 0,
  nuevo: 0,
  iscoreSum: 0,
  iscoreCount: 0,
  speedMinutes: [],
});

const channelKey = (row: ProspectoListRow) =>
  (row.campanaCanal?.trim() || row.origen_captacion?.trim() || "Sin canal").slice(0, 80);

const campanaKey = (row: ProspectoListRow) =>
  row.campana_id ?? `nombre:${row.campanaNombre?.trim() || "Sin campaña"}`;

export const buildAsesorScorecardFromParts = (input: {
  desarrolloId: string;
  period: ScorecardPeriod;
  prospectos: ProspectoListRow[];
  compliance: DesarrolloComplianceReport | null;
  cadencia: DesarrolloCadenciaReport | null;
  generatedAt?: string;
}): DesarrolloAsesorScorecardReport => {
  const { desarrolloId, period, prospectos, compliance, cadencia } = input;
  const playbookEnabled = Boolean(compliance?.playbookEnabled);
  const complianceByAsesor = new Map<string, AsesorComplianceSummary>(
    (compliance?.asesores ?? []).map((row) => [row.asesorId, row]),
  );
  const cadenciaByAsesor = new Map<string, AsesorCadenciaSummary>(
    (cadencia?.asesores ?? []).map((row) => [row.asesorId, row]),
  );

  const byAsesor = new Map<string, AggBucket>();
  let unassigned = 0;
  let totalContacted = 0;
  let totalFunnel = 0;
  let totalDiscarded = 0;
  let totalNuevo = 0;
  let iscoreSum = 0;
  let iscoreCount = 0;
  const allSpeedMinutes: number[] = [];

  type ChanAgg = {
    canal: string;
    leads: number;
    contacted: number;
    funnel: number;
    iscoreSum: number;
    iscoreCount: number;
  };
  const byCanal = new Map<string, ChanAgg>();

  type CampAgg = {
    campanaId: string | null;
    campanaNombre: string;
    canal: string;
    leads: number;
    contacted: number;
    funnel: number;
  };
  const byCampana = new Map<string, CampAgg>();

  for (const row of prospectos) {
    const etapa = resolveEtapa(row.etapa);
    const contacted = etapa ? CONTACT_ETAPAS.has(etapa) : false;
    const funnel = etapa ? FUNNEL_ETAPAS.has(etapa) : false;
    const discarded = etapa ? DISCARD_ETAPAS.has(etapa) : false;
    const nuevo = etapa === "nuevo";
    const speedMinutes = speedMinutesBetween(row.created_at, row.first_contacted_at);

    if (contacted) totalContacted += 1;
    if (funnel) totalFunnel += 1;
    if (discarded) totalDiscarded += 1;
    if (nuevo) totalNuevo += 1;
    if (typeof row.iscore === "number") {
      iscoreSum += row.iscore;
      iscoreCount += 1;
    }
    if (speedMinutes !== null) {
      allSpeedMinutes.push(speedMinutes);
    }

    const canal = channelKey(row);
    const chan = byCanal.get(canal) ?? {
      canal,
      leads: 0,
      contacted: 0,
      funnel: 0,
      iscoreSum: 0,
      iscoreCount: 0,
    };
    chan.leads += 1;
    if (contacted) chan.contacted += 1;
    if (funnel) chan.funnel += 1;
    if (typeof row.iscore === "number") {
      chan.iscoreSum += row.iscore;
      chan.iscoreCount += 1;
    }
    byCanal.set(canal, chan);

    const cKey = campanaKey(row);
    const camp = byCampana.get(cKey) ?? {
      campanaId: row.campana_id,
      campanaNombre: row.campanaNombre?.trim() || "Sin campaña",
      canal,
      leads: 0,
      contacted: 0,
      funnel: 0,
    };
    camp.leads += 1;
    if (contacted) camp.contacted += 1;
    if (funnel) camp.funnel += 1;
    byCampana.set(cKey, camp);

    if (!row.asesor_id) {
      unassigned += 1;
      continue;
    }

    const bucket =
      byAsesor.get(row.asesor_id) ??
      emptyBucket(row.asesor_id, row.asesorNombre?.trim() || "Sin nombre");
    bucket.assigned += 1;
    if (contacted) bucket.contacted += 1;
    if (funnel) bucket.funnel += 1;
    if (discarded) bucket.discarded += 1;
    if (nuevo) bucket.nuevo += 1;
    if (typeof row.iscore === "number") {
      bucket.iscoreSum += row.iscore;
      bucket.iscoreCount += 1;
    }
    if (speedMinutes !== null) {
      bucket.speedMinutes.push(speedMinutes);
    }
    byAsesor.set(row.asesor_id, bucket);
  }

  // Incluir asesores que solo aparecen en compliance/cadencia (cartera viva fuera del periodo).
  for (const row of compliance?.asesores ?? []) {
    if (!byAsesor.has(row.asesorId)) {
      byAsesor.set(row.asesorId, emptyBucket(row.asesorId, row.asesorNombre));
    }
  }
  for (const row of cadencia?.asesores ?? []) {
    if (!byAsesor.has(row.asesorId)) {
      byAsesor.set(row.asesorId, emptyBucket(row.asesorId, row.asesorNombre));
    }
  }

  const assignedLeads = prospectos.length - unassigned;
  const asesores: AsesorScorecardRow[] = Array.from(byAsesor.values())
    .map((bucket) => {
      const contactRatePct = pct(bucket.contacted, bucket.assigned);
      const funnelRatePct = pct(bucket.funnel, bucket.assigned);
      const discardRatePct = pct(bucket.discarded, bucket.assigned);
      const avgIscore =
        bucket.iscoreCount > 0
          ? Math.round((bucket.iscoreSum / bucket.iscoreCount) * 10) / 10
          : null;
      const qualityPct =
        avgIscore !== null ? clampPct((avgIscore / ISCORE_MAX) * 100) : 0;

      const speedAgg = aggregateSpeedToLead(bucket.speedMinutes, bucket.assigned);

      const complianceRow = complianceByAsesor.get(bucket.asesorId);
      const compliancePct =
        playbookEnabled && complianceRow && complianceRow.activeLeads > 0
          ? complianceRow.compliancePct
          : null;

      const cadenciaRow = cadenciaByAsesor.get(bucket.asesorId);
      const cadenciaHealthPct = cadenciaHealthFromSummary(cadenciaRow);

      const breakdown = computeAsesorScore(
        {
          contactRatePct,
          funnelRatePct,
          speedScorePct: speedAgg.speedScorePct,
          compliancePct,
          cadenciaHealthPct,
          qualityPct,
        },
        bucket.assigned,
      );

      return {
        asesorId: bucket.asesorId,
        asesorNombre: bucket.asesorNombre,
        assignedCount: bucket.assigned,
        contactedCount: bucket.contacted,
        funnelCount: bucket.funnel,
        discardedCount: bucket.discarded,
        nuevoCount: bucket.nuevo,
        contactRatePct,
        funnelRatePct,
        discardRatePct,
        avgIscore,
        qualityPct,
        speedMedianMinutes: speedAgg.medianMinutes,
        speedUnder60Pct: speedAgg.pctUnder60Min,
        speedCoveragePct: speedAgg.coveragePct,
        speedScorePct: speedAgg.speedScorePct,
        compliancePct,
        cadenciaHealthPct,
        overdueCadencia: cadenciaRow?.overdueToday ?? 0,
        loadSharePct: pct(bucket.assigned, assignedLeads),
        score: breakdown.score,
        band: breakdown.band,
        weightsUsed: breakdown.weightsUsed,
        sampleReliable: bucket.assigned >= ASESOR_SCORE_MIN_SAMPLE,
      };
    })
    .filter(
      (row) =>
        row.assignedCount > 0 || row.compliancePct !== null || row.cadenciaHealthPct !== null,
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.contactRatePct - a.contactRatePct ||
        b.assignedCount - a.assignedCount ||
        a.asesorNombre.localeCompare(b.asesorNombre, "es"),
    );

  const reliableScores = asesores
    .filter((row) => row.sampleReliable)
    .map((row) => row.score);
  const avgScoreReliable =
    reliableScores.length > 0
      ? clampPct(reliableScores.reduce((sum, n) => sum + n, 0) / reliableScores.length)
      : null;

  const canales: CanalScorecardRow[] = Array.from(byCanal.values())
    .map((row) => ({
      canal: row.canal,
      leads: row.leads,
      contactedCount: row.contacted,
      contactRatePct: pct(row.contacted, row.leads),
      funnelCount: row.funnel,
      funnelRatePct: pct(row.funnel, row.leads),
      avgIscore:
        row.iscoreCount > 0
          ? Math.round((row.iscoreSum / row.iscoreCount) * 10) / 10
          : null,
    }))
    .sort((a, b) => b.leads - a.leads || b.contactRatePct - a.contactRatePct);

  const campanas: CampanaScorecardRow[] = Array.from(byCampana.values())
    .map((row) => ({
      campanaId: row.campanaId,
      campanaNombre: row.campanaNombre,
      canal: row.canal,
      leads: row.leads,
      contactedCount: row.contacted,
      contactRatePct: pct(row.contacted, row.leads),
      funnelCount: row.funnel,
      funnelRatePct: pct(row.funnel, row.leads),
    }))
    .sort((a, b) => b.leads - a.leads || b.contactRatePct - a.contactRatePct)
    .slice(0, 25);

  return {
    desarrolloId,
    version: ASESOR_SCORE_VERSION,
    desde: period.desde,
    hasta: period.hasta,
    playbookEnabled,
    kpis: {
      totalLeads: prospectos.length,
      assignedLeads,
      unassignedLeads: unassigned,
      contactRatePct: pct(totalContacted, prospectos.length),
      funnelRatePct: pct(totalFunnel, prospectos.length),
      discardRatePct: pct(totalDiscarded, prospectos.length),
      nuevoRatePct: pct(totalNuevo, prospectos.length),
      avgIscore:
        iscoreCount > 0 ? Math.round((iscoreSum / iscoreCount) * 10) / 10 : null,
      asesoresActivos: asesores.filter((row) => row.assignedCount > 0).length,
      avgScoreReliable,
      speed: aggregateSpeedToLead(allSpeedMinutes, assignedLeads),
    },
    asesores,
    canales,
    campanas,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
};

export const getDesarrolloAsesorScorecard = async (
  desarrolloId: string,
  profile: AdminProfile | undefined,
  periodInput?: Partial<ScorecardPeriod>,
): Promise<DesarrolloAsesorScorecardReport> => {
  const defaults = defaultScorecardPeriod();
  const period: ScorecardPeriod = {
    desde: periodInput?.desde?.trim() || defaults.desde,
    hasta: periodInput?.hasta?.trim() || defaults.hasta,
  };

  if (period.desde > period.hasta) {
    throw new Error("La fecha desde no puede ser posterior a hasta.");
  }

  const [prospectos, compliance, cadencia] = await Promise.all([
    listProspectos(
      {
        desarrolloId,
        desde: period.desde,
        hasta: period.hasta,
        fechaEn: "created",
        spam: "exclude",
        duplicados: "exclude",
      },
      profile,
    ),
    getDesarrolloComplianceReport(desarrolloId, profile).catch(() => null),
    getDesarrolloCadenciaReport(desarrolloId).catch(() => null),
  ]);

  return buildAsesorScorecardFromParts({
    desarrolloId,
    period,
    prospectos,
    compliance,
    cadencia,
  });
};

export const filterScorecardByAsesor = (
  report: DesarrolloAsesorScorecardReport,
  asesorId: string | null | undefined,
): DesarrolloAsesorScorecardReport => {
  const id = asesorId?.trim();
  if (!id) return report;

  const asesores = report.asesores.filter((row) => row.asesorId === id);
  const row = asesores[0];
  if (!row) {
    return {
      ...report,
      asesores: [],
      kpis: {
        ...report.kpis,
        totalLeads: 0,
        assignedLeads: 0,
        unassignedLeads: 0,
        contactRatePct: 0,
        funnelRatePct: 0,
        discardRatePct: 0,
        nuevoRatePct: 0,
        avgIscore: null,
        asesoresActivos: 0,
        avgScoreReliable: null,
        speed: {
          sampleSize: 0,
          coveragePct: 0,
          medianMinutes: null,
          pctUnder5Min: 0,
          pctUnder60Min: 0,
          pctUnder24h: 0,
          speedScorePct: null,
        },
      },
      canales: [],
      campanas: [],
    };
  }

  return {
    ...report,
    asesores,
    kpis: {
      totalLeads: row.assignedCount,
      assignedLeads: row.assignedCount,
      unassignedLeads: 0,
      contactRatePct: row.contactRatePct,
      funnelRatePct: row.funnelRatePct,
      discardRatePct: row.discardRatePct,
      nuevoRatePct: pct(row.nuevoCount, row.assignedCount),
      avgIscore: row.avgIscore,
      asesoresActivos: row.assignedCount > 0 ? 1 : 0,
      avgScoreReliable: row.sampleReliable ? row.score : null,
      speed: {
        sampleSize: Math.round((row.speedCoveragePct / 100) * row.assignedCount),
        coveragePct: row.speedCoveragePct,
        medianMinutes: row.speedMedianMinutes,
        pctUnder5Min: 0,
        pctUnder60Min: row.speedUnder60Pct,
        pctUnder24h: 0,
        speedScorePct: row.speedScorePct,
      },
    },
  };
};

const escapeCsvCell = (value: string) => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/** CSV de ranking de asesores (UTF-8 con BOM lo agrega la ruta HTTP). */
export const exportAsesorScorecardCsv = (report: DesarrolloAsesorScorecardReport) => {
  const headers = [
    "Posicion",
    "Asesor",
    "Asesor ID",
    "Score",
    "Banda",
    "Muestra confiable",
    "Asignados",
    "Carga %",
    "Contacto %",
    "Funnel %",
    "Descarte %",
    "Nuevos",
    "Speed mediana min",
    "Speed <60min %",
    "Speed cobertura %",
    "Speed score",
    "Playbook %",
    "Cadencia %",
    "Cadencia vencidos",
    "iScore prom",
    "Desde",
    "Hasta",
    "Version",
  ];

  const rows = report.asesores.map((row, index) =>
    [
      String(index + 1),
      row.asesorNombre,
      row.asesorId,
      String(row.score),
      asesorScoreBandLabel[row.band],
      row.sampleReliable ? "Sí" : "No",
      String(row.assignedCount),
      String(row.loadSharePct),
      String(row.contactRatePct),
      String(row.funnelRatePct),
      String(row.discardRatePct),
      String(row.nuevoCount),
      row.speedMedianMinutes === null ? "" : String(row.speedMedianMinutes),
      String(row.speedUnder60Pct),
      String(row.speedCoveragePct),
      row.speedScorePct === null ? "" : String(row.speedScorePct),
      row.compliancePct === null ? "" : String(row.compliancePct),
      row.cadenciaHealthPct === null ? "" : String(row.cadenciaHealthPct),
      String(row.overdueCadencia),
      row.avgIscore === null ? "" : String(row.avgIscore),
      report.desde,
      report.hasta,
      report.version,
    ].map((cell) => escapeCsvCell(cell)),
  );

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
};

export { formatSpeedMinutesLabel };
