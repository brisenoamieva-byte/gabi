/**
 * AsesorScore — tipos, pesos y helpers puros (seguro para client components).
 * La carga de datos vive en asesor-scorecard.ts (servidor).
 */

import type { SpeedToLeadAggregate } from "@/lib/comercial/speed-to-lead-metrics";
import { formatSpeedMinutesLabel } from "@/lib/comercial/speed-to-lead-metrics";

export const ASESOR_SCORE_VERSION = "2026.3";

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

/** iScore máximo teórico (lead-scoring.ts) — referencia legacy / export. */
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

export type PerfilAbcResumen = {
  a: number;
  b: number;
  c: number;
  sin: number;
  total: number;
  perfiladosPct: number;
};

const clampPct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const pct = (num: number, den: number) => (den > 0 ? clampPct((num / den) * 100) : 0);

export const emptyPerfilAbcResumen = (): PerfilAbcResumen => ({
  a: 0,
  b: 0,
  c: 0,
  sin: 0,
  total: 0,
  perfiladosPct: 0,
});

export const buildPerfilAbcResumen = (counts: {
  a: number;
  b: number;
  c: number;
  sin: number;
}): PerfilAbcResumen => {
  const total = counts.a + counts.b + counts.c + counts.sin;
  const perfilados = counts.a + counts.b + counts.c;
  return {
    ...counts,
    total,
    perfiladosPct: pct(perfilados, total),
  };
};

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
  /** avg(activity) / referenceMax * 100. */
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

/** Input mínimo para salud de cadencia (evita importar cadencia-service en cliente). */
export type CadenciaHealthInput = {
  activeCadencias: number;
  overdueToday: number;
};

/** Salud de cadencia por asesor: penaliza vencidos vs cadencias activas. */
export const cadenciaHealthFromSummary = (
  row: CadenciaHealthInput | undefined,
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
  /** Promedio lead_activity_score (null si sin datos). */
  avgActivityScore: number | null;
  /** Legacy Xperience iScore (referencia). */
  avgIscore: number | null;
  qualityPct: number;
  perfilAbc: PerfilAbcResumen;
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
  avgActivityScore: number | null;
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
  avgActivityScore: number | null;
  avgIscore: number | null;
  perfilAbc: PerfilAbcResumen;
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
  activityScoreReferenceMax: number;
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
        avgActivityScore: null,
        avgIscore: null,
        perfilAbc: emptyPerfilAbcResumen(),
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
      avgActivityScore: row.avgActivityScore,
      avgIscore: row.avgIscore,
      perfilAbc: row.perfilAbc,
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
    "Activity score prom",
    "Calidad %",
    "Perfil A",
    "Perfil B",
    "Perfil C",
    "Sin perfil",
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
      row.avgActivityScore === null ? "" : String(row.avgActivityScore),
      String(row.qualityPct),
      String(row.perfilAbc.a),
      String(row.perfilAbc.b),
      String(row.perfilAbc.c),
      String(row.perfilAbc.sin),
      row.avgIscore === null ? "" : String(row.avgIscore),
      report.desde,
      report.hasta,
      report.version,
    ].map((cell) => escapeCsvCell(cell)),
  );

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
};

export { formatSpeedMinutesLabel, clampPct, pct };
