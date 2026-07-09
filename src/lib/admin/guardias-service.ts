import { assertDesarrolloAccess } from "@/lib/admin/permissions";
import { resolveAdminUserIdForDb } from "@/lib/admin/session";
import type { AdminProfile } from "@/lib/admin/types";
import {
  getMonthDates,
  getWeekDates,
  isGuardiaTurno,
  parseYmd,
  shiftMonth,
  shiftWeekStart,
  type GuardiaEstado,
  type GuardiaTurno,
} from "@/lib/comercial/guardias";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type GuardiaAsignacionRecord = {
  id: string;
  desarrolloId: string;
  asesorId: string;
  fecha: string;
  turno: GuardiaTurno;
  estado: GuardiaEstado;
  notas: string | null;
  creadoPorAdminId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GuardiaWeekPayload = {
  weekStart: string;
  weekDates: string[];
  asignaciones: GuardiaAsignacionRecord[];
  asesorCounts: Record<string, number>;
  coverage: { totalSlots: number; filledSlots: number; publishedSlots: number };
};

export type GuardiaMonthPayload = {
  monthStart: string;
  monthDates: string[];
  asignaciones: GuardiaAsignacionRecord[];
  asesorCounts: Record<string, number>;
  coverage: { totalSlots: number; filledSlots: number; publishedSlots: number };
};

type Row = {
  id: string;
  desarrollo_id: string;
  asesor_id: string;
  fecha: string;
  turno: string;
  estado: string;
  notas: string | null;
  creado_por_admin_id: string | null;
  created_at: string;
  updated_at: string;
};

const toRecord = (row: Row): GuardiaAsignacionRecord => ({
  id: row.id,
  desarrolloId: row.desarrollo_id,
  asesorId: row.asesor_id,
  fecha: row.fecha,
  turno: row.turno as GuardiaTurno,
  estado: row.estado as GuardiaEstado,
  notas: row.notas,
  creadoPorAdminId: row.creado_por_admin_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const assertGuardiasTable = (message: string) => {
  if (message.includes("guardia_asignaciones")) {
    throw new Error("Falta aplicar la migración 039_guardias_calendario.sql en Supabase.");
  }
};

export const listGuardiasWeek = async (
  desarrolloId: string,
  weekStart: string,
  profile: AdminProfile,
): Promise<GuardiaWeekPayload> => {
  assertDesarrolloAccess(profile, desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const weekDates = getWeekDates(weekStart);
  const desde = weekDates[0];
  const hasta = weekDates[6];

  const { data, error } = await supabase
    .from("guardia_asignaciones")
    .select("*")
    .eq("desarrollo_id", desarrolloId)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true });

  if (error) {
    assertGuardiasTable(error.message);
    throw new Error(error.message);
  }

  const asignaciones = (data ?? []).map((row) => toRecord(row as Row));
  const asesorCounts: Record<string, number> = {};
  let publishedSlots = 0;

  for (const item of asignaciones) {
    asesorCounts[item.asesorId] = (asesorCounts[item.asesorId] ?? 0) + 1;
    if (item.estado === "publicada") {
      publishedSlots += 1;
    }
  }

  const totalSlots = weekDates.length * 2;

  return {
    weekStart,
    weekDates,
    asignaciones,
    asesorCounts,
    coverage: {
      totalSlots,
      filledSlots: asignaciones.length,
      publishedSlots,
    },
  };
};

export const listGuardiasMonth = async (
  desarrolloId: string,
  monthStart: string,
  profile: AdminProfile,
): Promise<GuardiaMonthPayload> => {
  assertDesarrolloAccess(profile, desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const monthDates = getMonthDates(monthStart);
  const desde = monthDates[0];
  const hasta = monthDates[monthDates.length - 1];

  const { data, error } = await supabase
    .from("guardia_asignaciones")
    .select("*")
    .eq("desarrollo_id", desarrolloId)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true });

  if (error) {
    assertGuardiasTable(error.message);
    throw new Error(error.message);
  }

  const asignaciones = (data ?? []).map((row) => toRecord(row as Row));
  const asesorCounts: Record<string, number> = {};
  let publishedSlots = 0;

  for (const item of asignaciones) {
    asesorCounts[item.asesorId] = (asesorCounts[item.asesorId] ?? 0) + 1;
    if (item.estado === "publicada") {
      publishedSlots += 1;
    }
  }

  const totalSlots = monthDates.length * 2;

  return {
    monthStart,
    monthDates,
    asignaciones,
    asesorCounts,
    coverage: {
      totalSlots,
      filledSlots: asignaciones.length,
      publishedSlots,
    },
  };
};

export const upsertGuardiaAsignacion = async (
  input: {
    desarrolloId: string;
    asesorId: string;
    fecha: string;
    turno: GuardiaTurno;
  },
  profile: AdminProfile,
  adminUserId: string,
): Promise<GuardiaAsignacionRecord> => {
  assertDesarrolloAccess(profile, input.desarrolloId);

  if (!isGuardiaTurno(input.turno)) {
    throw new Error("Turno inválido.");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { data: asesor, error: asesorError } = await supabase
    .from("asesores")
    .select("id, activo, desarrollos_ids")
    .eq("id", input.asesorId)
    .maybeSingle();

  if (asesorError) {
    throw new Error(asesorError.message);
  }
  if (!asesor?.activo) {
    throw new Error("El asesor no está activo.");
  }
  const ids = (asesor.desarrollos_ids ?? []) as string[];
  if (!ids.includes(input.desarrolloId)) {
    throw new Error("El asesor no está asignado a este desarrollo.");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("guardia_asignaciones")
    .upsert(
      {
        desarrollo_id: input.desarrolloId,
        asesor_id: input.asesorId,
        fecha: input.fecha,
        turno: input.turno,
        estado: "borrador",
        creado_por_admin_id: resolveAdminUserIdForDb(adminUserId),
        updated_at: now,
      },
      { onConflict: "desarrollo_id,fecha,turno" },
    )
    .select("*")
    .single();

  if (error) {
    assertGuardiasTable(error.message);
    throw new Error(error.message);
  }

  return toRecord(data as Row);
};

export const clearGuardiaSlot = async (
  desarrolloId: string,
  fecha: string,
  turno: GuardiaTurno,
  profile: AdminProfile,
): Promise<void> => {
  assertDesarrolloAccess(profile, desarrolloId);

  if (!isGuardiaTurno(turno)) {
    throw new Error("Turno inválido.");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const { error } = await supabase
    .from("guardia_asignaciones")
    .delete()
    .eq("desarrollo_id", desarrolloId)
    .eq("fecha", fecha)
    .eq("turno", turno);

  if (error) {
    assertGuardiasTable(error.message);
    throw new Error(error.message);
  }
};

export const copyGuardiasWeekToNext = async (
  desarrolloId: string,
  fromWeekStart: string,
  profile: AdminProfile,
  adminUserId: string,
): Promise<{ copied: number; skipped: number }> => {
  assertDesarrolloAccess(profile, desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const sourceWeek = await listGuardiasWeek(desarrolloId, fromWeekStart, profile);
  if (!sourceWeek.asignaciones.length) {
    return { copied: 0, skipped: 0 };
  }

  const toWeekStart = shiftWeekStart(fromWeekStart, 1);
  const fromDates = sourceWeek.weekDates;
  const toDates = getWeekDates(toWeekStart);
  const dateMap = new Map(fromDates.map((fecha, index) => [fecha, toDates[index]]));

  const targetWeek = await listGuardiasWeek(desarrolloId, toWeekStart, profile);
  const occupiedSlots = new Set(
    targetWeek.asignaciones.map((item) => `${item.fecha}|${item.turno}`),
  );

  const now = new Date().toISOString();
  let copied = 0;
  let skipped = 0;

  for (const item of sourceWeek.asignaciones) {
    const targetDate = dateMap.get(item.fecha);
    if (!targetDate) {
      continue;
    }

    const slotKey = `${targetDate}|${item.turno}`;
    if (occupiedSlots.has(slotKey)) {
      skipped += 1;
      continue;
    }

    const { error } = await supabase.from("guardia_asignaciones").upsert(
      {
        desarrollo_id: desarrolloId,
        asesor_id: item.asesorId,
        fecha: targetDate,
        turno: item.turno,
        estado: "borrador",
        notas: item.notas,
        creado_por_admin_id: resolveAdminUserIdForDb(adminUserId),
        updated_at: now,
      },
      { onConflict: "desarrollo_id,fecha,turno" },
    );

    if (error) {
      assertGuardiasTable(error.message);
      throw new Error(error.message);
    }

    copied += 1;
    occupiedSlots.add(slotKey);
  }

  return { copied, skipped };
};

export const copyGuardiasMonthToNext = async (
  desarrolloId: string,
  fromMonthStart: string,
  profile: AdminProfile,
  adminUserId: string,
): Promise<{ copied: number; skipped: number }> => {
  assertDesarrolloAccess(profile, desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const sourceMonth = await listGuardiasMonth(desarrolloId, fromMonthStart, profile);
  if (!sourceMonth.asignaciones.length) {
    return { copied: 0, skipped: 0 };
  }

  const toMonthStart = shiftMonth(fromMonthStart, 1);
  const targetDates = getMonthDates(toMonthStart);
  const dayToTarget = new Map(
    targetDates.map((fecha) => [parseYmd(fecha).getDate(), fecha] as const),
  );

  const targetMonth = await listGuardiasMonth(desarrolloId, toMonthStart, profile);
  const occupiedSlots = new Set(
    targetMonth.asignaciones.map((item) => `${item.fecha}|${item.turno}`),
  );

  const now = new Date().toISOString();
  let copied = 0;
  let skipped = 0;

  for (const item of sourceMonth.asignaciones) {
    const dayNumber = parseYmd(item.fecha).getDate();
    const targetDate = dayToTarget.get(dayNumber);
    if (!targetDate) {
      skipped += 1;
      continue;
    }

    const slotKey = `${targetDate}|${item.turno}`;
    if (occupiedSlots.has(slotKey)) {
      skipped += 1;
      continue;
    }

    const { error } = await supabase.from("guardia_asignaciones").upsert(
      {
        desarrollo_id: desarrolloId,
        asesor_id: item.asesorId,
        fecha: targetDate,
        turno: item.turno,
        estado: "borrador",
        notas: item.notas,
        creado_por_admin_id: resolveAdminUserIdForDb(adminUserId),
        updated_at: now,
      },
      { onConflict: "desarrollo_id,fecha,turno" },
    );

    if (error) {
      assertGuardiasTable(error.message);
      throw new Error(error.message);
    }

    copied += 1;
    occupiedSlots.add(slotKey);
  }

  return { copied, skipped };
};

export const publishGuardiasWeek = async (
  desarrolloId: string,
  weekStart: string,
  profile: AdminProfile,
): Promise<{ updated: number }> => {
  assertDesarrolloAccess(profile, desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const weekDates = getWeekDates(weekStart);
  const { data, error } = await supabase
    .from("guardia_asignaciones")
    .update({ estado: "publicada", updated_at: new Date().toISOString() })
    .eq("desarrollo_id", desarrolloId)
    .gte("fecha", weekDates[0])
    .lte("fecha", weekDates[6])
    .eq("estado", "borrador")
    .select("id");

  if (error) {
    assertGuardiasTable(error.message);
    throw new Error(error.message);
  }

  return { updated: data?.length ?? 0 };
};

export const publishGuardiasMonth = async (
  desarrolloId: string,
  monthStart: string,
  profile: AdminProfile,
): Promise<{ updated: number }> => {
  assertDesarrolloAccess(profile, desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const monthDates = getMonthDates(monthStart);
  const { data, error } = await supabase
    .from("guardia_asignaciones")
    .update({ estado: "publicada", updated_at: new Date().toISOString() })
    .eq("desarrollo_id", desarrolloId)
    .gte("fecha", monthDates[0])
    .lte("fecha", monthDates[monthDates.length - 1])
    .eq("estado", "borrador")
    .select("id");

  if (error) {
    assertGuardiasTable(error.message);
    throw new Error(error.message);
  }

  return { updated: data?.length ?? 0 };
};

export type GuardiaConflicto = {
  asesorId: string;
  fecha: string;
  turno: GuardiaTurno;
  otroDesarrolloId: string;
};

export const listGuardiaConflictos = async (
  desarrolloId: string,
  weekStart: string,
  profile: AdminProfile,
): Promise<GuardiaConflicto[]> => {
  const week = await listGuardiasWeek(desarrolloId, weekStart, profile);
  return listGuardiaConflictosInRange(
    desarrolloId,
    week.asignaciones,
    week.weekDates[0],
    week.weekDates[6],
    profile,
  );
};

export const listGuardiaConflictosMonth = async (
  desarrolloId: string,
  monthStart: string,
  profile: AdminProfile,
): Promise<GuardiaConflicto[]> => {
  const month = await listGuardiasMonth(desarrolloId, monthStart, profile);
  const monthDates = month.monthDates;
  return listGuardiaConflictosInRange(
    desarrolloId,
    month.asignaciones,
    monthDates[0],
    monthDates[monthDates.length - 1],
    profile,
  );
};

const listGuardiaConflictosInRange = async (
  desarrolloId: string,
  asignaciones: GuardiaAsignacionRecord[],
  desde: string,
  hasta: string,
  profile: AdminProfile,
): Promise<GuardiaConflicto[]> => {
  assertDesarrolloAccess(profile, desarrolloId);

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const asesorIds = Array.from(new Set(asignaciones.map((a) => a.asesorId)));
  if (!asesorIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("guardia_asignaciones")
    .select("asesor_id, fecha, turno, desarrollo_id")
    .in("asesor_id", asesorIds)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .neq("desarrollo_id", desarrolloId);

  if (error) {
    assertGuardiasTable(error.message);
    return [];
  }

  const localKeys = new Set(
    asignaciones.map((a) => `${a.asesorId}|${a.fecha}|${a.turno}`),
  );

  return (data ?? [])
    .filter((row) =>
      localKeys.has(`${row.asesor_id as string}|${row.fecha as string}|${row.turno as string}`),
    )
    .map((row) => ({
      asesorId: row.asesor_id as string,
      fecha: row.fecha as string,
      turno: row.turno as GuardiaTurno,
      otroDesarrolloId: row.desarrollo_id as string,
    }));
};
