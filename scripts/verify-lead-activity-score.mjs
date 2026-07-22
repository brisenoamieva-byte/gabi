/**
 * Smoke test del motor de score de lead (sin Supabase).
 * Uso: npx tsx scripts/verify-lead-activity-score.mjs
 */
import {
  computeLeadActivityScore,
  DEFAULT_LEAD_SCORE_ACTIONS,
} from "../src/lib/comercial/lead-activity-score.ts";

const base = () => ({
  email: null,
  telefono: null,
  campanaId: null,
  createdAt: "2026-07-22T10:00:00.000Z",
  firstContactedAt: null,
  visitaAgendadaOn: null,
  visitaRealizadaOn: null,
  perfilCalificacionLead: null,
  etapa: "nuevo",
  esSpam: false,
  esDuplicado: false,
  calificacion: null,
  playbookStepIds: [],
  cadenciaCanalesCompletados: [],
  cotizacionesCount: 0,
  recorridoCompletado: false,
});

const assert = (cond, msg) => {
  if (!cond) {
    throw new Error(msg);
  }
};

const phoneOnly = computeLeadActivityScore(
  { ...base(), telefono: "5512345678" },
  DEFAULT_LEAD_SCORE_ACTIONS,
);
assert(phoneOnly.score === 2, `phone only expected 2 got ${phoneOnly.score}`);

const rich = computeLeadActivityScore(
  {
    ...base(),
    telefono: "5512345678",
    email: "lead@example.com",
    campanaId: "camp-1",
    firstContactedAt: "2026-07-22T10:30:00.000Z",
    playbookStepIds: ["whatsapp-inicial", "llamada-d0", "visita-agendada", "cotizacion"],
    visitaAgendadaOn: "2026-07-22",
    cotizacionesCount: 1,
    perfilCalificacionLead: "A",
  },
  DEFAULT_LEAD_SCORE_ACTIONS,
);
// 2+2+2+3+5+3+5+8+10+10 = 50
assert(rich.score === 50, `rich expected 50 got ${rich.score}`);

const spam = computeLeadActivityScore(
  { ...base(), telefono: "5512345678", esSpam: true },
  DEFAULT_LEAD_SCORE_ACTIONS,
);
assert(spam.score === 0, `spam expected 0 got ${spam.score}`);

console.log("ok: lead activity score phone / rich / spam");
