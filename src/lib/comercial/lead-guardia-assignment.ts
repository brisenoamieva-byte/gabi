import { formatDateYmd } from "@/lib/comercial/guardias";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const MEXICO_TZ = "America/Mexico_City";

export const getMexicoCityYmd = (date: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) {
    return formatDateYmd(date);
  }

  return `${year}-${month}-${day}`;
};

export const getMexicoCityHour = (date: Date = new Date()): number => {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: MEXICO_TZ,
    hour: "numeric",
    hour12: false,
  }).format(date);

  return Number.parseInt(hour, 10);
};

/**
 * Asigna el siguiente asesor en carrusel entre quienes tienen guardia publicada hoy.
 * Respeta turno vigente (matutino 10–15, vespertino 15–20) como primer candidato.
 */
export const assignAsesorByGuardiaCarousel = async (
  desarrolloId: string,
): Promise<string | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const today = getMexicoCityYmd();
  const hour = getMexicoCityHour();

  const { data: guardias, error } = await supabase
    .from("guardia_asignaciones")
    .select("asesor_id, turno")
    .eq("desarrollo_id", desarrolloId)
    .eq("fecha", today)
    .eq("estado", "publicada")
    .order("turno", { ascending: true });

  if (error) {
    if (error.message.includes("guardia_asignaciones")) {
      return null;
    }
    throw new Error(error.message);
  }

  if (!guardias?.length) {
    return null;
  }

  const pool = Array.from(new Set(guardias.map((row) => row.asesor_id as string))).sort();

  const preferredTurno = hour >= 15 ? "vespertino" : hour >= 10 ? "matutino" : null;
  const preferredAsesor = preferredTurno
    ? guardias.find((row) => row.turno === preferredTurno)?.asesor_id
    : null;

  const { data: stateRow } = await supabase
    .from("lead_carousel_state")
    .select("last_asesor_id, lead_count")
    .eq("desarrollo_id", desarrolloId)
    .eq("fecha", today)
    .maybeSingle();

  let nextAsesorId: string;

  if (preferredAsesor && pool.includes(preferredAsesor as string)) {
    const lastId = stateRow?.last_asesor_id as string | null;
    if (!lastId || lastId !== preferredAsesor) {
      nextAsesorId = preferredAsesor as string;
    } else {
      const lastIndex = pool.indexOf(lastId);
      nextAsesorId = pool[(lastIndex + 1) % pool.length];
    }
  } else {
    const lastId = stateRow?.last_asesor_id as string | null;
    const lastIndex = lastId ? pool.indexOf(lastId) : -1;
    nextAsesorId = pool[(lastIndex + 1) % pool.length];
  }

  const leadCount = ((stateRow?.lead_count as number | undefined) ?? 0) + 1;

  const { error: upsertError } = await supabase.from("lead_carousel_state").upsert(
    {
      desarrollo_id: desarrolloId,
      fecha: today,
      last_asesor_id: nextAsesorId,
      lead_count: leadCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "desarrollo_id,fecha" },
  );

  if (upsertError) {
    if (upsertError.message.includes("lead_carousel_state")) {
      return nextAsesorId;
    }
    throw new Error(upsertError.message);
  }

  return nextAsesorId;
};
