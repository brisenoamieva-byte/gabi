import { getAsesorById } from "@/lib/admin/asesores-service";
import { desarrollos } from "@/lib/data";
import {
  CADENCIA_TOUCH_TEMPLATES,
  buildCadenciaLlamadaGuion,
  buildCadenciaTelUrl,
  buildCadenciaWhatsAppScript,
  buildCadenciaWhatsAppUrl,
  computeTouchDueAt,
  formatCadenciaWindow,
  getCadenciaDayIndex,
  getMexicoCityParts,
  isInReminderWindow,
  isTouchDueToday,
  isTouchOverdue,
  type CadenciaCanal,
  type CadenciaStatus,
  type CadenciaTouchStatus,
} from "@/lib/comercial/cadencia-perfilamiento";
import { isCrmPlaybookPilotDesarrollo } from "@/lib/comercial/crm-playbook";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type CadenciaTouchRow = {
  id: string;
  cadenciaId: string;
  prospectoId: string;
  touchKey: string;
  dayOffset: number;
  sequenceInDay: number;
  canal: CadenciaCanal;
  label: string;
  scriptHint: string | null;
  windowStartHour: number | null;
  windowEndHour: number | null;
  dueAt: string;
  status: CadenciaTouchStatus;
  completedAt: string | null;
};

export type CadenciaHoyItem = {
  touch: CadenciaTouchRow;
  prospectoId: string;
  prospectoNombre: string;
  prospectoTelefono: string | null;
  desarrolloId: string;
  desarrolloNombre: string;
  cadenciaStartedAt: string;
  cadenciaDayIndex: number;
  windowLabel: string;
  isOverdue: boolean;
  isDueToday: boolean;
  whatsappUrl: string | null;
  telUrl: string | null;
  llamadaGuion: string | null;
};

type DbCadenciaRow = {
  id: string;
  prospecto_id: string;
  desarrollo_id: string;
  asesor_id: string | null;
  started_at: string;
  status: CadenciaStatus;
};

type DbTouchRow = {
  id: string;
  cadencia_id: string;
  prospecto_id: string;
  touch_key: string;
  day_offset: number;
  sequence_in_day: number;
  canal: CadenciaCanal;
  label: string;
  script_hint: string | null;
  window_start_hour: number | null;
  window_end_hour: number | null;
  due_at: string;
  status: CadenciaTouchStatus;
  completed_at: string | null;
};

const mapTouch = (row: DbTouchRow): CadenciaTouchRow => ({
  id: row.id,
  cadenciaId: row.cadencia_id,
  prospectoId: row.prospecto_id,
  touchKey: row.touch_key,
  dayOffset: row.day_offset,
  sequenceInDay: row.sequence_in_day,
  canal: row.canal,
  label: row.label,
  scriptHint: row.script_hint,
  windowStartHour: row.window_start_hour,
  windowEndHour: row.window_end_hour,
  dueAt: row.due_at,
  status: row.status,
  completedAt: row.completed_at,
});

const getDesarrolloNombre = (desarrolloId: string): string =>
  desarrollos.find((item) => item.id === desarrolloId)?.nombre ?? desarrolloId;

const buildScriptHint = (
  template: (typeof CADENCIA_TOUCH_TEMPLATES)[number],
  prospectNombre: string,
  desarrolloNombre: string,
  asesorNombre: string,
): string => {
  const ctx = {
    prospectNombre,
    desarrolloNombre,
    asesorNombre,
    touchLabel: template.label,
    dayOffset: template.dayOffset,
  };

  return template.canal === "whatsapp"
    ? buildCadenciaWhatsAppScript(ctx)
    : buildCadenciaLlamadaGuion(ctx);
};

export const bootstrapCadenciaForProspecto = async (
  prospectoId: string,
): Promise<{ created: boolean; cadenciaId?: string }> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { created: false };
  }

  const { data: prospecto, error: prospectoError } = await supabase
    .from("prospectos")
    .select("id, desarrollo_id, asesor_id, etapa, nombre, created_at, activo")
    .eq("id", prospectoId)
    .maybeSingle();

  if (prospectoError || !prospecto) {
    return { created: false };
  }

  if (!prospecto.activo || prospecto.etapa !== "nuevo" || !prospecto.asesor_id) {
    return { created: false };
  }

  if (!isCrmPlaybookPilotDesarrollo(prospecto.desarrollo_id as string)) {
    return { created: false };
  }

  const { data: existing } = await supabase
    .from("prospecto_cadencia")
    .select("id")
    .eq("prospecto_id", prospectoId)
    .maybeSingle();

  if (existing) {
    return { created: false, cadenciaId: existing.id as string };
  }

  const startedAt = prospecto.created_at as string;
  const asesor = await getAsesorById(prospecto.asesor_id as string);
  const asesorNombre = asesor?.nombre ?? "Tu asesor";
  const desarrolloNombre = getDesarrolloNombre(prospecto.desarrollo_id as string);

  const { data: cadencia, error: cadenciaError } = await supabase
    .from("prospecto_cadencia")
    .insert({
      prospecto_id: prospectoId,
      desarrollo_id: prospecto.desarrollo_id,
      asesor_id: prospecto.asesor_id,
      started_at: startedAt,
      status: "active",
    })
    .select("id")
    .single();

  if (cadenciaError || !cadencia) {
    console.error("[cadencia] bootstrap failed", cadenciaError);
    return { created: false };
  }

  const startedDate = new Date(startedAt);
  const touches = CADENCIA_TOUCH_TEMPLATES.map((template) => ({
    cadencia_id: cadencia.id,
    prospecto_id: prospectoId,
    touch_key: template.touchKey,
    day_offset: template.dayOffset,
    sequence_in_day: template.sequenceInDay,
    canal: template.canal,
    label: template.label,
    script_hint: buildScriptHint(
      template,
      prospecto.nombre as string,
      desarrolloNombre,
      asesorNombre,
    ),
    window_start_hour: template.windowStartHour ?? null,
    window_end_hour: template.windowEndHour ?? null,
    due_at: computeTouchDueAt(startedDate, template).toISOString(),
    status: "pending" as const,
  }));

  const { error: touchesError } = await supabase.from("prospecto_cadencia_touches").insert(touches);

  if (touchesError) {
    console.error("[cadencia] touches insert failed", touchesError);
    await supabase.from("prospecto_cadencia").delete().eq("id", cadencia.id);
    return { created: false };
  }

  await autoCompleteInitialTouches(prospectoId, cadencia.id as string);

  return { created: true, cadenciaId: cadencia.id as string };
};

const autoCompleteInitialTouches = async (prospectoId: string, cadenciaId: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  const { data: autoWa } = await supabase
    .from("lead_contact_events")
    .select("id")
    .eq("prospecto_id", prospectoId)
    .eq("canal", "whatsapp_prospect")
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();

  if (!autoWa) {
    return;
  }

  const { data: touch } = await supabase
    .from("prospecto_cadencia_touches")
    .select("id, prospecto_id")
    .eq("cadencia_id", cadenciaId)
    .eq("touch_key", "d0-wa")
    .eq("status", "pending")
    .maybeSingle();

  if (!touch) {
    return;
  }

  const { data: prospecto } = await supabase
    .from("prospectos")
    .select("asesor_id")
    .eq("id", prospectoId)
    .maybeSingle();

  await completeCadenciaTouchInternal(
    touch.id as string,
    prospecto?.asesor_id as string | null,
    "system_auto_wa",
    true,
  );
};

export const pauseCadenciaForProspecto = async (
  prospectoId: string,
  reason: string,
): Promise<void> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  const now = new Date().toISOString();

  const { data: cadencia } = await supabase
    .from("prospecto_cadencia")
    .select("id, status")
    .eq("prospecto_id", prospectoId)
    .eq("status", "active")
    .maybeSingle();

  if (!cadencia) {
    return;
  }

  await supabase
    .from("prospecto_cadencia")
    .update({
      status: "paused",
      paused_at: now,
      pause_reason: reason,
      updated_at: now,
    })
    .eq("id", cadencia.id);

  await supabase
    .from("prospecto_cadencia_touches")
    .update({ status: "paused" })
    .eq("cadencia_id", cadencia.id)
    .eq("status", "pending");
};

export const completeCadenciaForProspecto = async (
  prospectoId: string,
  reason: string,
): Promise<void> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  const now = new Date().toISOString();

  const { data: cadencia } = await supabase
    .from("prospecto_cadencia")
    .select("id")
    .eq("prospecto_id", prospectoId)
    .in("status", ["active", "paused"])
    .maybeSingle();

  if (!cadencia) {
    return;
  }

  await supabase
    .from("prospecto_cadencia")
    .update({
      status: "completed",
      pause_reason: reason,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", cadencia.id);

  await supabase
    .from("prospecto_cadencia_touches")
    .update({ status: "paused" })
    .eq("cadencia_id", cadencia.id)
    .eq("status", "pending");
};

const syncPlaybookStepForTouch = async (
  prospectoId: string,
  touchKey: string,
  asesorId: string | null,
) => {
  const template = CADENCIA_TOUCH_TEMPLATES.find((item) => item.touchKey === touchKey);
  if (!template?.playbookStepId || !asesorId) {
    return;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  await supabase.from("prospecto_playbook_progress").upsert(
    {
      prospecto_id: prospectoId,
      step_id: template.playbookStepId,
      completed_at: new Date().toISOString(),
      completed_by: asesorId,
    },
    { onConflict: "prospecto_id,step_id" },
  );
};

const completeCadenciaTouchInternal = async (
  touchId: string,
  asesorId: string | null,
  source: string,
  skipAuth = false,
): Promise<CadenciaTouchRow | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data: touch, error } = await supabase
    .from("prospecto_cadencia_touches")
    .select("*")
    .eq("id", touchId)
    .maybeSingle();

  if (error || !touch) {
    return null;
  }

  const { data: cadenciaRow } = await supabase
    .from("prospecto_cadencia")
    .select("id, prospecto_id, desarrollo_id, asesor_id, status")
    .eq("id", touch.cadencia_id as string)
    .maybeSingle();

  if (!cadenciaRow) {
    return null;
  }

  const cadencia = cadenciaRow as {
    id: string;
    prospecto_id: string;
    desarrollo_id: string;
    asesor_id: string | null;
    status: CadenciaStatus;
  };

  if (cadencia.status !== "active") {
    return null;
  }

  if (!skipAuth && asesorId && cadencia.asesor_id !== asesorId) {
    throw new Error("Este toque no está asignado a ti.");
  }

  if (touch.status !== "pending") {
    return mapTouch(touch as DbTouchRow);
  }

  const now = new Date().toISOString();
  const completedBy = asesorId ?? cadencia.asesor_id;

  const { data: updated, error: updateError } = await supabase
    .from("prospecto_cadencia_touches")
    .update({
      status: "completed",
      completed_at: now,
      completed_by: completedBy,
    })
    .eq("id", touchId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return null;
  }

  await supabase.from("lead_contact_events").insert({
    prospecto_id: cadencia.prospecto_id,
    desarrollo_id: cadencia.desarrollo_id,
    canal: touch.canal === "whatsapp" ? "cadencia_whatsapp" : "cadencia_llamada",
    destinatario_tipo: "prospecto",
    status: "sent",
    payload: { touchKey: touch.touch_key, source },
  });

  if (completedBy) {
    await syncPlaybookStepForTouch(
      cadencia.prospecto_id,
      touch.touch_key as string,
      completedBy,
    );
  }

  if (touch.touch_key === "d7-call") {
    await expireCadenciaIfNoResponse(cadencia.id);
  }

  return mapTouch(updated as DbTouchRow);
};

const expireCadenciaIfNoResponse = async (cadenciaId: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  const now = new Date().toISOString();

  await supabase
    .from("prospecto_cadencia")
    .update({
      status: "expired",
      completed_at: now,
      pause_reason: "Cadencia completada sin respuesta — revisar si marcar Perdido.",
      updated_at: now,
    })
    .eq("id", cadenciaId)
    .eq("status", "active");
};

export const completeCadenciaTouch = async (
  asesorId: string,
  touchId: string,
): Promise<CadenciaTouchRow> => {
  const result = await completeCadenciaTouchInternal(touchId, asesorId, "asesor_manual");
  if (!result) {
    throw new Error("No se pudo completar el toque.");
  }
  return result;
};

export const ensureCadenciasForAsesor = async (
  asesorId: string,
  desarrolloId: string,
): Promise<void> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase || !isCrmPlaybookPilotDesarrollo(desarrolloId)) {
    return;
  }

  const { data: prospectos } = await supabase
    .from("prospectos")
    .select("id")
    .eq("asesor_id", asesorId)
    .eq("desarrollo_id", desarrolloId)
    .eq("etapa", "nuevo")
    .eq("activo", true);

  for (const row of prospectos ?? []) {
    await bootstrapCadenciaForProspecto(row.id as string);
  }
};

const enrichHoyItem = (
  touch: DbTouchRow,
  cadencia: DbCadenciaRow,
  prospecto: { nombre: string; telefono: string | null },
  asesorNombre: string,
  now: Date,
): CadenciaHoyItem => {
  const desarrolloId = cadencia.desarrollo_id;
  const desarrolloNombre = getDesarrolloNombre(desarrolloId);
  const template = CADENCIA_TOUCH_TEMPLATES.find((item) => item.touchKey === touch.touch_key);

  const ctx = {
    prospectNombre: prospecto.nombre,
    desarrolloNombre,
    asesorNombre,
    touchLabel: touch.label,
    dayOffset: touch.day_offset,
  };

  return {
    touch: mapTouch(touch),
    prospectoId: cadencia.prospecto_id,
    prospectoNombre: prospecto.nombre,
    prospectoTelefono: prospecto.telefono,
    desarrolloId,
    desarrolloNombre,
    cadenciaStartedAt: cadencia.started_at,
    cadenciaDayIndex: getCadenciaDayIndex(new Date(cadencia.started_at), now),
    windowLabel: template ? formatCadenciaWindow(template) : "Hoy",
    isOverdue: isTouchOverdue(new Date(touch.due_at), now),
    isDueToday: isTouchDueToday(new Date(touch.due_at), now),
    whatsappUrl:
      touch.canal === "whatsapp" && prospecto.telefono
        ? buildCadenciaWhatsAppUrl(prospecto.telefono, ctx)
        : null,
    telUrl:
      touch.canal === "llamada" && prospecto.telefono
        ? buildCadenciaTelUrl(prospecto.telefono)
        : null,
    llamadaGuion: touch.canal === "llamada" ? buildCadenciaLlamadaGuion(ctx) : null,
  };
};

export const listCadenciaHoyForAsesor = async (
  asesorId: string,
  desarrolloId: string,
): Promise<CadenciaHoyItem[]> => {
  await ensureCadenciasForAsesor(asesorId, desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const asesor = await getAsesorById(asesorId);
  const asesorNombre = asesor?.nombre ?? "Asesor";
  const now = new Date();

  const { data: cadencias, error } = await supabase
    .from("prospecto_cadencia")
    .select("id, prospecto_id, desarrollo_id, asesor_id, started_at, status")
    .eq("asesor_id", asesorId)
    .eq("desarrollo_id", desarrolloId)
    .eq("status", "active");

  if (error || !cadencias?.length) {
    return [];
  }

  const cadenciaIds = cadencias.map((row) => row.id as string);
  const prospectoIds = cadencias.map((row) => row.prospecto_id as string);

  const [{ data: touches }, { data: prospectos }] = await Promise.all([
    supabase
      .from("prospecto_cadencia_touches")
      .select("*")
      .in("cadencia_id", cadenciaIds)
      .eq("status", "pending")
      .order("due_at", { ascending: true }),
    supabase.from("prospectos").select("id, nombre, telefono").in("id", prospectoIds),
  ]);

  if (!touches?.length) {
    return [];
  }

  const cadenciaMap = new Map(cadencias.map((row) => [row.id as string, row as DbCadenciaRow]));
  const prospectoMap = new Map(
    (prospectos ?? []).map((row) => [
      row.id as string,
      { nombre: row.nombre as string, telefono: row.telefono as string | null },
    ]),
  );

  const items: CadenciaHoyItem[] = [];

  for (const touch of touches as DbTouchRow[]) {
    const cadencia = cadenciaMap.get(touch.cadencia_id);
    const prospecto = prospectoMap.get(touch.prospecto_id);
    if (!cadencia || !prospecto) {
      continue;
    }

    const dueAt = new Date(touch.due_at);
    const actionable =
      isTouchDueToday(dueAt, now) || isTouchOverdue(dueAt, now) || dueAt.getTime() <= now.getTime();

    if (!actionable) {
      continue;
    }

    items.push(enrichHoyItem(touch, cadencia, prospecto, asesorNombre, now));
  }

  items.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) {
      return a.isOverdue ? -1 : 1;
    }
    return new Date(a.touch.dueAt).getTime() - new Date(b.touch.dueAt).getTime();
  });

  return items;
};

export type CadenciaReminderTarget = {
  asesorId: string;
  asesorNombre: string;
  asesorTelefono: string | null;
  asesorEmail: string | null;
  desarrolloId: string;
  desarrolloNombre: string;
  touchCount: number;
  priorityLabel: string;
  touches: CadenciaHoyItem[];
};

export const listCadenciaReminderTargets = async (
  desarrolloId: string,
  reminderHour: number,
): Promise<CadenciaReminderTarget[]> => {
  if (!isInReminderWindow(reminderHour)) {
    return [];
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data: asesores } = await supabase
    .from("prospecto_cadencia")
    .select("asesor_id")
    .eq("desarrollo_id", desarrolloId)
    .eq("status", "active");

  const asesorIds = Array.from(
    new Set((asesores ?? []).map((row) => row.asesor_id as string).filter(Boolean)),
  );

  const targets: CadenciaReminderTarget[] = [];

  for (const asesorId of asesorIds) {
    const touches = await listCadenciaHoyForAsesor(asesorId, desarrolloId);
    const inWindow = touches.filter((item) => {
      const hour = item.touch.windowStartHour ?? getMexicoCityParts(new Date(item.touch.dueAt)).hour;
      return hour <= reminderHour && reminderHour <= (item.touch.windowEndHour ?? reminderHour + 2);
    });

    if (!inWindow.length) {
      continue;
    }

    const asesor = await getAsesorById(asesorId);
    if (!asesor) {
      continue;
    }

    const priority = inWindow[0];
    targets.push({
      asesorId,
      asesorNombre: asesor.nombre,
      asesorTelefono: asesor.telefono ?? null,
      asesorEmail: asesor.email ?? null,
      desarrolloId,
      desarrolloNombre: getDesarrolloNombre(desarrolloId),
      touchCount: inWindow.length,
      priorityLabel: `${priority.prospectoNombre}: ${priority.touch.label}`,
      touches: inWindow,
    });
  }

  return targets;
};

export const markCadenciaRemindersSent = async (
  touchIds: string[],
): Promise<void> => {
  if (!touchIds.length) {
    return;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  await supabase
    .from("prospecto_cadencia_touches")
    .update({ reminder_sent_at: new Date().toISOString() })
    .in("id", touchIds);
};

export const getCadenciaSummaryForProspecto = async (
  prospectoId: string,
): Promise<{
  status: CadenciaStatus | null;
  dayIndex: number;
  pendingCount: number;
  nextTouch: CadenciaTouchRow | null;
} | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data: cadencia } = await supabase
    .from("prospecto_cadencia")
    .select("id, started_at, status")
    .eq("prospecto_id", prospectoId)
    .maybeSingle();

  if (!cadencia) {
    return null;
  }

  const { data: touches } = await supabase
    .from("prospecto_cadencia_touches")
    .select("*")
    .eq("cadencia_id", cadencia.id)
    .order("due_at", { ascending: true });

  const pending = (touches ?? []).filter((row) => row.status === "pending");
  const next = pending[0] ? mapTouch(pending[0] as DbTouchRow) : null;

  return {
    status: cadencia.status as CadenciaStatus,
    dayIndex: getCadenciaDayIndex(new Date(cadencia.started_at as string)),
    pendingCount: pending.length,
    nextTouch: next,
  };
};

export const ensureCadenciasForDesarrollo = async (desarrolloId: string): Promise<void> => {
  if (!isCrmPlaybookPilotDesarrollo(desarrolloId)) {
    return;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  const { data: prospectos } = await supabase
    .from("prospectos")
    .select("id")
    .eq("desarrollo_id", desarrolloId)
    .eq("etapa", "nuevo")
    .eq("activo", true);

  for (const row of prospectos ?? []) {
    await bootstrapCadenciaForProspecto(row.id as string);
  }
};

export type CadenciaProspectoRow = {
  prospectoId: string;
  prospectoNombre: string;
  asesorId: string | null;
  asesorNombre: string;
  cadenciaStatus: CadenciaStatus;
  dayIndex: number;
  startedAt: string;
  pendingTouches: number;
  completedTouches: number;
  overdueTouches: number;
  nextTouchLabel: string | null;
  nextTouchDueAt: string | null;
};

export type AsesorCadenciaSummary = {
  asesorId: string;
  asesorNombre: string;
  activeCadencias: number;
  overdueToday: number;
  dueToday: number;
};

export type DesarrolloCadenciaReport = {
  desarrolloId: string;
  activeCount: number;
  pausedCount: number;
  expiredCount: number;
  overdueTouchesTotal: number;
  dueTodayTotal: number;
  asesores: AsesorCadenciaSummary[];
  prospectos: CadenciaProspectoRow[];
  generatedAt: string;
};

export const getDesarrolloCadenciaReport = async (
  desarrolloId: string,
): Promise<DesarrolloCadenciaReport> => {
  await ensureCadenciasForDesarrollo(desarrolloId);

  const supabase = createSupabaseServiceClient();
  const now = new Date();
  const empty: DesarrolloCadenciaReport = {
    desarrolloId,
    activeCount: 0,
    pausedCount: 0,
    expiredCount: 0,
    overdueTouchesTotal: 0,
    dueTodayTotal: 0,
    asesores: [],
    prospectos: [],
    generatedAt: now.toISOString(),
  };

  if (!supabase) {
    return empty;
  }

  const { data: cadencias } = await supabase
    .from("prospecto_cadencia")
    .select("id, prospecto_id, asesor_id, started_at, status")
    .eq("desarrollo_id", desarrolloId)
    .order("started_at", { ascending: false });

  if (!cadencias?.length) {
    return empty;
  }

  const cadenciaIds = cadencias.map((row) => row.id as string);
  const prospectoIds = cadencias.map((row) => row.prospecto_id as string);

  const [{ data: touches }, { data: prospectos }] = await Promise.all([
    supabase.from("prospecto_cadencia_touches").select("*").in("cadencia_id", cadenciaIds),
    supabase.from("prospectos").select("id, nombre").in("id", prospectoIds),
  ]);

  const prospectoMap = new Map(
    (prospectos ?? []).map((row) => [row.id as string, row.nombre as string]),
  );

  const touchesByCadencia = new Map<string, DbTouchRow[]>();
  for (const touch of (touches ?? []) as DbTouchRow[]) {
    const list = touchesByCadencia.get(touch.cadencia_id) ?? [];
    list.push(touch);
    touchesByCadencia.set(touch.cadencia_id, list);
  }

  const asesorCache = new Map<string, string>();
  const resolveAsesorNombre = async (asesorId: string | null) => {
    if (!asesorId) {
      return "Sin asesor";
    }
    if (asesorCache.has(asesorId)) {
      return asesorCache.get(asesorId)!;
    }
    const asesor = await getAsesorById(asesorId);
    const nombre = asesor?.nombre ?? asesorId;
    asesorCache.set(asesorId, nombre);
    return nombre;
  };

  let activeCount = 0;
  let pausedCount = 0;
  let expiredCount = 0;
  let overdueTouchesTotal = 0;
  let dueTodayTotal = 0;

  const asesorAgg = new Map<string, AsesorCadenciaSummary>();
  const prospectoRows: CadenciaProspectoRow[] = [];

  for (const cadencia of cadencias) {
    const status = cadencia.status as CadenciaStatus;
    if (status === "active") {
      activeCount += 1;
    } else if (status === "paused") {
      pausedCount += 1;
    } else if (status === "expired") {
      expiredCount += 1;
    }

    const cadenciaTouches = touchesByCadencia.get(cadencia.id as string) ?? [];
    const pending = cadenciaTouches.filter((row) => row.status === "pending");
    const completed = cadenciaTouches.filter((row) => row.status === "completed");
    const overdue = pending.filter((row) => isTouchOverdue(new Date(row.due_at), now));
    const dueToday = pending.filter((row) => isTouchDueToday(new Date(row.due_at), now));

    overdueTouchesTotal += overdue.length;
    dueTodayTotal += dueToday.length;

    const nextPending = pending.sort(
      (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
    )[0];

    const asesorId = cadencia.asesor_id as string | null;
    const asesorNombre = await resolveAsesorNombre(asesorId);

    if (asesorId && status === "active") {
      const current = asesorAgg.get(asesorId) ?? {
        asesorId,
        asesorNombre,
        activeCadencias: 0,
        overdueToday: 0,
        dueToday: 0,
      };
      current.activeCadencias += 1;
      current.overdueToday += overdue.length;
      current.dueToday += dueToday.length;
      asesorAgg.set(asesorId, current);
    }

    prospectoRows.push({
      prospectoId: cadencia.prospecto_id as string,
      prospectoNombre: prospectoMap.get(cadencia.prospecto_id as string) ?? "Prospecto",
      asesorId,
      asesorNombre,
      cadenciaStatus: status,
      dayIndex: getCadenciaDayIndex(new Date(cadencia.started_at as string), now),
      startedAt: cadencia.started_at as string,
      pendingTouches: pending.length,
      completedTouches: completed.length,
      overdueTouches: overdue.length,
      nextTouchLabel: nextPending?.label ?? null,
      nextTouchDueAt: nextPending?.due_at ?? null,
    });
  }

  prospectoRows.sort((a, b) => {
    if (a.overdueTouches !== b.overdueTouches) {
      return b.overdueTouches - a.overdueTouches;
    }
    if (a.cadenciaStatus === "active" && b.cadenciaStatus !== "active") {
      return -1;
    }
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });

  const asesores = Array.from(asesorAgg.values()).sort(
    (a, b) => b.overdueToday - a.overdueToday || b.dueToday - a.dueToday,
  );

  return {
    desarrolloId,
    activeCount,
    pausedCount,
    expiredCount,
    overdueTouchesTotal,
    dueTodayTotal,
    asesores,
    prospectos: prospectoRows,
    generatedAt: now.toISOString(),
  };
};
