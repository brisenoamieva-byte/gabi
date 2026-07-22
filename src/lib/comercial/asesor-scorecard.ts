/**
 * AsesorScore — carga de datos (servidor).
 * Tipos/pesos/helpers puros: asesor-scorecard-shared.ts
 */

import type { AdminProfile } from "@/lib/admin/types";
import { listProspectos, type ProspectoListRow } from "@/lib/admin/prospectos-service";
import {
  ASESOR_SCORE_MIN_SAMPLE,
  ASESOR_SCORE_VERSION,
  buildPerfilAbcResumen,
  cadenciaHealthFromSummary,
  clampPct,
  computeAsesorScore,
  defaultScorecardPeriod,
  pct,
  type AsesorScorecardRow,
  type CampanaScorecardRow,
  type CanalScorecardRow,
  type DesarrolloAsesorScorecardReport,
  type ScorecardPeriod,
} from "@/lib/comercial/asesor-scorecard-shared";
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
import { getLeadActivityScoreReferenceMax } from "@/lib/comercial/lead-activity-score";
import {
  isProspectoEtapa,
  normalizeProspectoEtapaValue,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";
import {
  aggregateSpeedToLead,
  speedMinutesBetween,
} from "@/lib/comercial/speed-to-lead-metrics";

export * from "@/lib/comercial/asesor-scorecard-shared";

const CONTACT_ETAPAS = new Set<ProspectoEtapa>([
  "contactado",
  "cita",
  "visita",
  "apartado",
  "vendido",
]);

const FUNNEL_ETAPAS = new Set<ProspectoEtapa>([
  "cita",
  "visita",
  "apartado",
  "vendido",
]);

const DISCARD_ETAPAS = new Set<ProspectoEtapa>(["perdido", "cancelado"]);

const resolveEtapa = (raw: string): ProspectoEtapa | null =>
  normalizeProspectoEtapaValue(raw) ?? (isProspectoEtapa(raw) ? raw : null);

const readActivityScore = (row: ProspectoListRow): number | null =>
  typeof row.lead_activity_score === "number" ? row.lead_activity_score : null;

const bumpPerfil = (
  counts: { a: number; b: number; c: number; sin: number },
  raw: string | null | undefined,
) => {
  const key = raw?.trim().toUpperCase();
  if (key === "A") counts.a += 1;
  else if (key === "B") counts.b += 1;
  else if (key === "C") counts.c += 1;
  else counts.sin += 1;
};

type AggBucket = {
  asesorId: string;
  asesorNombre: string;
  assigned: number;
  contacted: number;
  funnel: number;
  discarded: number;
  nuevo: number;
  activitySum: number;
  activityCount: number;
  iscoreSum: number;
  iscoreCount: number;
  perfil: { a: number; b: number; c: number; sin: number };
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
  activitySum: 0,
  activityCount: 0,
  iscoreSum: 0,
  iscoreCount: 0,
  perfil: { a: 0, b: 0, c: 0, sin: 0 },
  speedMinutes: [],
});

const channelKey = (row: ProspectoListRow) =>
  (row.campanaCanal?.trim() || row.origen_captacion?.trim() || "Sin canal").slice(0, 80);

const campanaKey = (row: ProspectoListRow) =>
  row.campana_id ?? `nombre:${row.campanaNombre?.trim() || "Sin campaña"}`;

const avgRounded = (sum: number, count: number): number | null =>
  count > 0 ? Math.round((sum / count) * 10) / 10 : null;

export const buildAsesorScorecardFromParts = (input: {
  desarrolloId: string;
  period: ScorecardPeriod;
  prospectos: ProspectoListRow[];
  compliance: DesarrolloComplianceReport | null;
  cadencia: DesarrolloCadenciaReport | null;
  activityScoreReferenceMax?: number;
  generatedAt?: string;
}): DesarrolloAsesorScorecardReport => {
  const { desarrolloId, period, prospectos, compliance, cadencia } = input;
  const activityScoreReferenceMax =
    input.activityScoreReferenceMax ?? getLeadActivityScoreReferenceMax();
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
  let activitySum = 0;
  let activityCount = 0;
  let iscoreSum = 0;
  let iscoreCount = 0;
  const perfilTotales = { a: 0, b: 0, c: 0, sin: 0 };
  const allSpeedMinutes: number[] = [];

  type ChanAgg = {
    canal: string;
    leads: number;
    contacted: number;
    funnel: number;
    activitySum: number;
    activityCount: number;
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
    const activity = readActivityScore(row);

    if (contacted) totalContacted += 1;
    if (funnel) totalFunnel += 1;
    if (discarded) totalDiscarded += 1;
    if (nuevo) totalNuevo += 1;
    if (activity !== null) {
      activitySum += activity;
      activityCount += 1;
    }
    if (typeof row.iscore === "number") {
      iscoreSum += row.iscore;
      iscoreCount += 1;
    }
    bumpPerfil(perfilTotales, row.perfil_calificacion_lead);
    if (speedMinutes !== null) {
      allSpeedMinutes.push(speedMinutes);
    }

    const canal = channelKey(row);
    const chan = byCanal.get(canal) ?? {
      canal,
      leads: 0,
      contacted: 0,
      funnel: 0,
      activitySum: 0,
      activityCount: 0,
      iscoreSum: 0,
      iscoreCount: 0,
    };
    chan.leads += 1;
    if (contacted) chan.contacted += 1;
    if (funnel) chan.funnel += 1;
    if (activity !== null) {
      chan.activitySum += activity;
      chan.activityCount += 1;
    }
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
    if (activity !== null) {
      bucket.activitySum += activity;
      bucket.activityCount += 1;
    }
    if (typeof row.iscore === "number") {
      bucket.iscoreSum += row.iscore;
      bucket.iscoreCount += 1;
    }
    bumpPerfil(bucket.perfil, row.perfil_calificacion_lead);
    if (speedMinutes !== null) {
      bucket.speedMinutes.push(speedMinutes);
    }
    byAsesor.set(row.asesor_id, bucket);
  }

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
      const avgActivityScore = avgRounded(bucket.activitySum, bucket.activityCount);
      const avgIscore = avgRounded(bucket.iscoreSum, bucket.iscoreCount);
      const qualityPct =
        avgActivityScore !== null
          ? clampPct((avgActivityScore / activityScoreReferenceMax) * 100)
          : 0;
      const perfilAbc = buildPerfilAbcResumen(bucket.perfil);

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
        avgActivityScore,
        avgIscore,
        qualityPct,
        perfilAbc,
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
      avgActivityScore: avgRounded(row.activitySum, row.activityCount),
      avgIscore: avgRounded(row.iscoreSum, row.iscoreCount),
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
    activityScoreReferenceMax,
    kpis: {
      totalLeads: prospectos.length,
      assignedLeads,
      unassignedLeads: unassigned,
      contactRatePct: pct(totalContacted, prospectos.length),
      funnelRatePct: pct(totalFunnel, prospectos.length),
      discardRatePct: pct(totalDiscarded, prospectos.length),
      nuevoRatePct: pct(totalNuevo, prospectos.length),
      avgActivityScore: avgRounded(activitySum, activityCount),
      avgIscore: avgRounded(iscoreSum, iscoreCount),
      perfilAbc: buildPerfilAbcResumen(perfilTotales),
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
