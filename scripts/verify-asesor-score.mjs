/**
 * Verificación rápida de AsesorScore + speed-to-lead.
 * Uso: node --import tsx scripts/verify-asesor-score.mjs
 */
import {
  ASESOR_SCORE_MIN_SAMPLE,
  ASESOR_SCORE_WEIGHTS,
  bandFromScore,
  cadenciaHealthFromSummary,
  computeAsesorScore,
} from "../src/lib/comercial/asesor-scorecard-shared.ts";
import {
  aggregateSpeedToLead,
  speedMinutesBetween,
  speedMinutesToScore,
} from "../src/lib/comercial/speed-to-lead-metrics.ts";
import { shouldRecordFirstContactOnEtapaChange } from "../src/lib/comercial/speed-to-lead.ts";

let failed = 0;

const assert = (cond, msg) => {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`ok: ${msg}`);
  }
};

const full = computeAsesorScore(
  {
    contactRatePct: 100,
    funnelRatePct: 100,
    speedScorePct: 100,
    compliancePct: 100,
    cadenciaHealthPct: 100,
    qualityPct: 100,
  },
  10,
);
assert(full.score === 100, `score perfecto = 100 (got ${full.score})`);
assert(full.band === "elite", `banda elite (got ${full.band})`);

const noProcess = computeAsesorScore(
  {
    contactRatePct: 50,
    funnelRatePct: 50,
    speedScorePct: null,
    compliancePct: null,
    cadenciaHealthPct: null,
    qualityPct: 50,
  },
  10,
);
assert(noProcess.score === 50, `redistribuye a 50 (got ${noProcess.score})`);
const contactWeightExpected =
  ASESOR_SCORE_WEIGHTS.contact /
  (ASESOR_SCORE_WEIGHTS.contact + ASESOR_SCORE_WEIGHTS.funnel + ASESOR_SCORE_WEIGHTS.quality);
assert(
  Math.abs((noProcess.weightsUsed.contact ?? 0) - contactWeightExpected) < 0.001,
  "peso contacto redistribuido sin speed/compliance/cadencia",
);

const small = computeAsesorScore(
  {
    contactRatePct: 90,
    funnelRatePct: 80,
    speedScorePct: 90,
    compliancePct: 90,
    cadenciaHealthPct: 90,
    qualityPct: 80,
  },
  ASESOR_SCORE_MIN_SAMPLE - 1,
);
assert(small.band === "insuficiente", "muestra pequeña → insuficiente");

assert(bandFromScore(80, 10) === "elite", "umbral elite");
assert(bandFromScore(65, 10) === "solido", "umbral solido");
assert(bandFromScore(50, 10) === "riesgo", "umbral riesgo");
assert(bandFromScore(49, 10) === "critico", "umbral critico");

assert(cadenciaHealthFromSummary(undefined) === null, "sin cadencia → null");
assert(
  cadenciaHealthFromSummary({
    asesorId: "a",
    asesorNombre: "A",
    activeCadencias: 0,
    overdueToday: 0,
    dueToday: 0,
  }) === null,
  "0 activas → null",
);
assert(
  cadenciaHealthFromSummary({
    asesorId: "a",
    asesorNombre: "A",
    activeCadencias: 10,
    overdueToday: 0,
    dueToday: 2,
  }) === 100,
  "sin vencidos → 100",
);

const weightSum = Object.values(ASESOR_SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
assert(Math.abs(weightSum - 1) < 1e-9, "pesos suman 1");

assert(speedMinutesToScore(3) === 100, "speed <5 min = 100");
assert(speedMinutesToScore(45) === 75, "speed <60 min = 75");
assert(speedMinutesToScore(200) === 55, "speed <5h = 55");
assert(speedMinutesToScore(null) === null, "speed null = null");

const created = "2026-07-21T12:00:00.000Z";
const touched = "2026-07-21T12:30:00.000Z";
assert(speedMinutesBetween(created, touched) === 30, "delta 30 min");
assert(speedMinutesBetween(created, null) === null, "sin first touch");

assert(
  shouldRecordFirstContactOnEtapaChange("nuevo", "contactado"),
  "nuevo→contactado registra",
);
assert(
  !shouldRecordFirstContactOnEtapaChange("nuevo", "perdido"),
  "nuevo→perdido no registra",
);
assert(
  !shouldRecordFirstContactOnEtapaChange("contactado", "cita"),
  "ya contactado no re-registra por etapa",
);

const agg = aggregateSpeedToLead([3, 30, 90, null], 4);
assert(agg.sampleSize === 3, "aggregate sample 3");
assert(agg.coveragePct === 75, "coverage 75%");
assert(agg.pctUnder60Min === 67, `under 60 ~67 (got ${agg.pctUnder60Min})`);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAsesorScore + speed-to-lead OK");
