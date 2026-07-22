/**
 * Métricas puras de speed-to-lead (seguro para client components).
 * La persistencia vive en speed-to-lead.ts (servidor).
 */

export const SPEED_TO_LEAD_VERSION = "2026.1";

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

export const formatSpeedMinutesLabel = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours * 10) / 10} h`;
  const days = hours / 24;
  return `${Math.round(days * 10) / 10} d`;
};
