/**
 * Crea cadencias para todos los prospectos en etapa "nuevo" de un desarrollo piloto.
 *   npm run cadencia:backfill
 *   npm run cadencia:backfill -- pasaje-alamos
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const PILOT_DESARROLLOS = ["pasaje-alamos", "la-vista-residencial", "mision-la-gavia"];

const TOUCHES = [
  { touch_key: "d0-wa", day_offset: 0, sequence_in_day: 1, canal: "whatsapp", label: "WhatsApp de bienvenida", due_hours: 1 },
  { touch_key: "d0-call", day_offset: 0, sequence_in_day: 2, canal: "llamada", label: "Primera llamada (mismo día)", due_hours: 2, window_start: 12, window_end: 17 },
  { touch_key: "d1-call", day_offset: 1, sequence_in_day: 1, canal: "llamada", label: "Llamada de seguimiento", window_start: 12, window_end: 14 },
  { touch_key: "d1-wa", day_offset: 1, sequence_in_day: 2, canal: "whatsapp", label: "WhatsApp de seguimiento", window_start: 17, window_end: 19 },
  { touch_key: "d3-wa", day_offset: 3, sequence_in_day: 1, canal: "whatsapp", label: "WhatsApp — reactivación", window_start: 9, window_end: 11 },
  { touch_key: "d3-call", day_offset: 3, sequence_in_day: 2, canal: "llamada", label: "Llamada — reactivación", window_start: 17, window_end: 19 },
  { touch_key: "d4-call", day_offset: 4, sequence_in_day: 1, canal: "llamada", label: "Llamada de insistencia", window_start: 12, window_end: 14 },
  { touch_key: "d4-wa", day_offset: 4, sequence_in_day: 2, canal: "whatsapp", label: "WhatsApp de insistencia", window_start: 17, window_end: 19 },
  { touch_key: "d7-wa", day_offset: 7, sequence_in_day: 1, canal: "whatsapp", label: "Último WhatsApp", window_start: 9, window_end: 11 },
  { touch_key: "d7-call", day_offset: 7, sequence_in_day: 2, canal: "llamada", label: "Última llamada — cierre de cadencia", window_start: 12, window_end: 14 },
];

const desarrolloId = process.argv[2]?.trim() || "pasaje-alamos";

if (!PILOT_DESARROLLOS.includes(desarrolloId)) {
  console.error(`Desarrollo no piloto: ${desarrolloId}`);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const mexicoParts = (date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
  };
};

const mexicoLocalToUtc = (year, month, day, hour) => {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, 0));
  const asMexico = mexicoParts(guess);
  const targetMs = Date.UTC(year, month - 1, day, hour, 0);
  const actualMs = Date.UTC(asMexico.year, asMexico.month - 1, asMexico.day, asMexico.hour, 0);
  return new Date(guess.getTime() + (targetMs - actualMs));
};

const computeDueAt = (startedAt, touch) => {
  if (touch.due_hours != null) {
    return new Date(startedAt.getTime() + touch.due_hours * 60 * 60 * 1000);
  }
  const start = mexicoParts(startedAt);
  const targetDay = new Date(Date.UTC(start.year, start.month - 1, start.day + touch.day_offset));
  const tp = mexicoParts(targetDay);
  return mexicoLocalToUtc(tp.year, tp.month, tp.day, touch.window_start ?? 9);
};

const { data: prospectos, error } = await supabase
  .from("prospectos")
  .select("id, asesor_id, created_at")
  .eq("desarrollo_id", desarrolloId)
  .eq("etapa", "nuevo")
  .eq("activo", true);

if (error) {
  console.error(error.message);
  process.exit(1);
}

let created = 0;
let skipped = 0;

for (const prospecto of prospectos ?? []) {
  if (!prospecto.asesor_id) {
    skipped += 1;
    continue;
  }

  const { data: existing } = await supabase
    .from("prospecto_cadencia")
    .select("id")
    .eq("prospecto_id", prospecto.id)
    .maybeSingle();

  if (existing) {
    skipped += 1;
    continue;
  }

  const startedAt = new Date(prospecto.created_at);

  const { data: cadencia, error: cadenciaError } = await supabase
    .from("prospecto_cadencia")
    .insert({
      prospecto_id: prospecto.id,
      desarrollo_id: desarrolloId,
      asesor_id: prospecto.asesor_id,
      started_at: prospecto.created_at,
      status: "active",
    })
    .select("id")
    .single();

  if (cadenciaError || !cadencia) {
    console.error(prospecto.id, cadenciaError?.message);
    continue;
  }

  const touches = TOUCHES.map((touch) => ({
    cadencia_id: cadencia.id,
    prospecto_id: prospecto.id,
    touch_key: touch.touch_key,
    day_offset: touch.day_offset,
    sequence_in_day: touch.sequence_in_day,
    canal: touch.canal,
    label: touch.label,
    window_start_hour: touch.window_start ?? null,
    window_end_hour: touch.window_end ?? null,
    due_at: computeDueAt(startedAt, touch).toISOString(),
    status: "pending",
  }));

  const { error: touchesError } = await supabase.from("prospecto_cadencia_touches").insert(touches);

  if (touchesError) {
    console.error(prospecto.id, touchesError.message);
    await supabase.from("prospecto_cadencia").delete().eq("id", cadencia.id);
    continue;
  }

  created += 1;
}

console.log(`${desarrolloId}: ${created} cadencia(s) creada(s), ${skipped} omitida(s).`);
