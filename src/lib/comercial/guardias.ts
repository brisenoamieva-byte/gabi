import { PASAJE_ALAMOS_ID } from "@/lib/catalog/desarrollos-registry";

export const GUARDIA_TURNOS = ["matutino", "vespertino"] as const;
export type GuardiaTurno = (typeof GUARDIA_TURNOS)[number];

export const GUARDIA_ESTADOS = ["borrador", "publicada"] as const;
export type GuardiaEstado = (typeof GUARDIA_ESTADOS)[number];

/** Desarrollo por defecto en admin Guardias (Pasaje Álamos). */
export const GUARDIAS_PILOT_DESARROLLO_ID = PASAJE_ALAMOS_ID;

export const guardiaTurnoLabel: Record<GuardiaTurno, string> = {
  matutino: "10:00 – 15:00",
  vespertino: "15:00 – 20:00",
};

export const guardiaTurnoShortLabel: Record<GuardiaTurno, string> = {
  matutino: "Matutino",
  vespertino: "Vespertino",
};

export const guardiaEstadoLabel: Record<GuardiaEstado, string> = {
  borrador: "Borrador",
  publicada: "Publicada",
};

export const isGuardiaTurno = (value: string): value is GuardiaTurno =>
  GUARDIA_TURNOS.includes(value as GuardiaTurno);

/** Lunes de la semana ISO (fecha local YYYY-MM-DD). */
export const getWeekStartMonday = (date: Date = new Date()): string => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return formatDateYmd(d);
};

export const formatDateYmd = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const parseYmd = (ymd: string): Date => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Siete fechas YYYY-MM-DD desde el lunes de weekStart. */
export const getWeekDates = (weekStart: string): string[] => {
  const start = parseYmd(weekStart);
  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return formatDateYmd(d);
  });
};

export const shiftWeekStart = (weekStart: string, deltaWeeks: number): string => {
  const d = parseYmd(weekStart);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return formatDateYmd(d);
};

export const formatWeekRangeLabel = (weekStart: string): string => {
  const dates = getWeekDates(weekStart);
  const start = parseYmd(dates[0]);
  const end = parseYmd(dates[6]);
  const fmt = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });
  return `${fmt.format(start)} – ${fmt.format(end)} ${end.getFullYear()}`;
};

export const formatDayHeader = (ymd: string): { dow: string; day: string } => {
  const d = parseYmd(ymd);
  const dow = new Intl.DateTimeFormat("es-MX", { weekday: "short" }).format(d);
  const day = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(d);
  return { dow, day };
};

/** Primer día del mes (YYYY-MM-01) para la fecha dada. */
export const getMonthStart = (date: Date = new Date()): string => {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return formatDateYmd(d);
};

/** Todas las fechas YYYY-MM-DD del mes indicado por monthStart (día 1). */
export const getMonthDates = (monthStart: string): string[] => {
  const first = parseYmd(monthStart);
  const year = first.getFullYear();
  const month = first.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) =>
    formatDateYmd(new Date(year, month, index + 1)),
  );
};

export const shiftMonth = (monthStart: string, deltaMonths: number): string => {
  const d = parseYmd(monthStart);
  d.setMonth(d.getMonth() + deltaMonths, 1);
  return formatDateYmd(d);
};

export const formatMonthLabel = (monthStart: string): string => {
  const d = parseYmd(monthStart);
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(d);
};

export const GUARDIA_WEEKDAY_LABELS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"] as const;

/** Índice 0=lun … 6=dom a partir de YYYY-MM-DD (fecha local). */
export const getYmdWeekdayIndexMondayFirst = (ymd: string): number => {
  const day = parseYmd(ymd).getDay();
  return day === 0 ? 6 : day - 1;
};

/**
 * Días únicos por día de la semana (lun…dom) por asesor.
 * Si alguien tiene matutino y vespertino el mismo lunes, cuenta 1 lunes.
 */
export const buildAsesorWeekdayDayCounts = (
  asignaciones: Array<{ asesorId: string; fecha: string }>,
): Record<string, number[]> => {
  const fechasByAsesor = new Map<string, Set<string>>();

  for (const item of asignaciones) {
    const set = fechasByAsesor.get(item.asesorId) ?? new Set<string>();
    set.add(item.fecha);
    fechasByAsesor.set(item.asesorId, set);
  }

  const result: Record<string, number[]> = {};
  for (const [asesorId, fechas] of fechasByAsesor) {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const fecha of fechas) {
      const idx = getYmdWeekdayIndexMondayFirst(fecha);
      counts[idx] += 1;
    }
    result[asesorId] = counts;
  }
  return result;
};

export type GuardiaCalendarDay = {
  fecha: string;
  inMonth: boolean;
};

export type GuardiaCalendarWeek = GuardiaCalendarDay[];

/** Cuadrícula mensual (semanas × 7 días, lunes a domingo). */
export const getMonthCalendarGrid = (monthStart: string): GuardiaCalendarWeek[] => {
  const first = parseYmd(monthStart);
  const year = first.getFullYear();
  const month = first.getMonth();
  const gridStart = new Date(year, month, 1);
  const dayOfWeek = gridStart.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  gridStart.setDate(gridStart.getDate() + mondayOffset);

  const weeks: GuardiaCalendarWeek[] = [];
  const cursor = new Date(gridStart);
  const lastOfMonth = new Date(year, month + 1, 0);

  while (true) {
    const week: GuardiaCalendarDay[] = [];
    for (let index = 0; index < 7; index += 1) {
      week.push({
        fecha: formatDateYmd(cursor),
        inMonth: cursor.getMonth() === month,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);

    const sunday = parseYmd(week[6].fecha);
    if (sunday >= lastOfMonth) {
      break;
    }
  }

  return weeks;
};

/** Color de chip por asesor (estable). */
export const guardiaAsesorColor = (asesorId: string): string => {
  let hash = 0;
  for (let i = 0; i < asesorId.length; i += 1) {
    hash = (hash * 31 + asesorId.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 42% 38%)`;
};

export const guardiaAsesorChipStyle = (asesorId: string): { backgroundColor: string; color: string } => {
  const bg = guardiaAsesorColor(asesorId);
  return { backgroundColor: bg, color: "#fff" };
};
