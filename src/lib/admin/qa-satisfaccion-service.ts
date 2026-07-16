import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type EncuestaTipo = "qa" | "satisfaccion";
export type EncuestaCanal = "whatsapp" | "email" | "sms" | "otro";
export type EncuestaSource = "adryo" | "webhook" | "manual" | "xperience";

export type IngestEncuestaInput = {
  prospectoId?: string;
  xperienceId?: number;
  desarrolloId?: string;
  tipo: EncuestaTipo;
  canal?: EncuestaCanal;
  score: number;
  comentario?: string;
  source?: EncuestaSource;
  externalId?: string;
  respondedAt?: string;
};

export type IngestEncuestaResult =
  | { status: "created"; encuestaId: string; prospectoId: string }
  | { status: "duplicate"; encuestaId: string }
  | { status: "rejected"; message: string };

const clampScore = (score: number) => Math.min(10, Math.max(0, score));

export const isQaEncuestasAvailable = async (): Promise<boolean> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from("prospecto_encuestas").select("id", { head: true, count: "exact" });
  return !error;
};

export const ingestProspectoEncuesta = async (
  input: IngestEncuestaInput,
): Promise<IngestEncuestaResult> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  if (input.externalId) {
    const { data: existing } = await supabase
      .from("prospecto_encuestas")
      .select("id")
      .eq("external_id", input.externalId)
      .maybeSingle();

    if (existing?.id) {
      return { status: "duplicate", encuestaId: existing.id };
    }
  }

  let prospectoId = input.prospectoId;
  let desarrolloId = input.desarrolloId;

  if (!prospectoId && input.xperienceId) {
    const { data: prospecto } = await supabase
      .from("prospectos")
      .select("id, desarrollo_id")
      .eq("xperience_id", input.xperienceId)
      .maybeSingle();

    if (prospecto) {
      prospectoId = prospecto.id;
      desarrolloId = prospecto.desarrollo_id;
    }
  }

  if (!prospectoId) {
    return { status: "rejected", message: "prospectoId o xperienceId requerido." };
  }

  if (!desarrolloId) {
    const { data: prospecto } = await supabase
      .from("prospectos")
      .select("desarrollo_id")
      .eq("id", prospectoId)
      .maybeSingle();

    if (!prospecto) {
      return { status: "rejected", message: "Prospecto no encontrado." };
    }
    desarrolloId = prospecto.desarrollo_id;
  }

  const score = clampScore(input.score);
  const canal = input.canal ?? "whatsapp";
  const source = input.source ?? "webhook";
  const respondedAt = input.respondedAt ?? new Date().toISOString();

  const { data: encuesta, error: insertError } = await supabase
    .from("prospecto_encuestas")
    .insert({
      prospecto_id: prospectoId,
      desarrollo_id: desarrolloId,
      tipo: input.tipo,
      canal,
      score,
      comentario: input.comentario?.trim() || null,
      source,
      external_id: input.externalId ?? null,
      responded_at: respondedAt,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505" && input.externalId) {
      return { status: "duplicate", encuestaId: input.externalId };
    }
    throw new Error(insertError.message);
  }

  const patch: Record<string, unknown> = {};
  if (input.tipo === "qa") {
    patch.qa_score = score;
    patch.qa_responded_at = respondedAt;
    patch.qa_canal = canal;
  } else {
    patch.satisfaccion_score = score;
    patch.satisfaccion_responded_at = respondedAt;
  }

  const { error: updateError } = await supabase
    .from("prospectos")
    .update(patch)
    .eq("id", prospectoId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { status: "created", encuestaId: encuesta.id, prospectoId };
};

export type LeadsQaResumen = {
  totalEncuestas: number;
  qaRespondidas: number;
  satisfaccionRespondidas: number;
  promedioQa: number | null;
  promedioSatisfaccion: number | null;
  porCanal: Record<string, number>;
  distribucionQa: Record<string, number>;
  distribucionSatisfaccion: Record<string, number>;
};

const scoreBucket = (score: number) => {
  if (score <= 2) return "0-2";
  if (score <= 4) return "3-4";
  if (score <= 6) return "5-6";
  if (score <= 8) return "7-8";
  return "9-10";
};

export const emptyLeadsQaResumen = (): LeadsQaResumen => ({
  totalEncuestas: 0,
  qaRespondidas: 0,
  satisfaccionRespondidas: 0,
  promedioQa: null,
  promedioSatisfaccion: null,
  porCanal: {},
  distribucionQa: {},
  distribucionSatisfaccion: {},
});

export const aggregateQaFromEncuestas = (
  rows: Array<{
    tipo: EncuestaTipo;
    canal: string;
    score: number;
  }>,
): LeadsQaResumen => {
  if (!rows.length) {
    return emptyLeadsQaResumen();
  }

  const porCanal: Record<string, number> = {};
  const distribucionQa: Record<string, number> = {};
  const distribucionSatisfaccion: Record<string, number> = {};
  let qaSum = 0;
  let qaCount = 0;
  let satSum = 0;
  let satCount = 0;

  for (const row of rows) {
    porCanal[row.canal] = (porCanal[row.canal] ?? 0) + 1;
    const bucket = scoreBucket(row.score);

    if (row.tipo === "qa") {
      qaCount += 1;
      qaSum += row.score;
      distribucionQa[bucket] = (distribucionQa[bucket] ?? 0) + 1;
    } else {
      satCount += 1;
      satSum += row.score;
      distribucionSatisfaccion[bucket] = (distribucionSatisfaccion[bucket] ?? 0) + 1;
    }
  }

  return {
    totalEncuestas: rows.length,
    qaRespondidas: qaCount,
    satisfaccionRespondidas: satCount,
    promedioQa: qaCount ? Math.round((qaSum / qaCount) * 10) / 10 : null,
    promedioSatisfaccion: satCount ? Math.round((satSum / satCount) * 10) / 10 : null,
    porCanal,
    distribucionQa,
    distribucionSatisfaccion,
  };
};

export const fetchLeadsQaResumen = async (filters: {
  desarrolloId: string;
  desde?: string;
  hasta?: string;
  asesorId?: string;
}): Promise<LeadsQaResumen> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return emptyLeadsQaResumen();
  }

  let query = supabase
    .from("prospecto_encuestas")
    .select("tipo, canal, score, prospecto_id, responded_at")
    .eq("desarrollo_id", filters.desarrolloId);

  if (filters.desde) {
    query = query.gte("responded_at", `${filters.desde}T00:00:00.000Z`);
  }
  if (filters.hasta) {
    query = query.lte("responded_at", `${filters.hasta}T23:59:59.999Z`);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01" || error.message.includes("prospecto_encuestas")) {
      return emptyLeadsQaResumen();
    }
    throw new Error(error.message);
  }

  let rows = data ?? [];

  if (filters.asesorId && rows.length) {
    const prospectoIds = Array.from(new Set(rows.map((row) => row.prospecto_id)));
    const { data: prospectos } = await supabase
      .from("prospectos")
      .select("id")
      .in("id", prospectoIds)
      .eq("asesor_id", filters.asesorId);

    const allowed = new Set((prospectos ?? []).map((p) => p.id));
    rows = rows.filter((row) => allowed.has(row.prospecto_id));
  }

  return aggregateQaFromEncuestas(
    rows.map((row) => ({
      tipo: row.tipo as EncuestaTipo,
      canal: row.canal,
      score: Number(row.score),
    })),
  );
};
