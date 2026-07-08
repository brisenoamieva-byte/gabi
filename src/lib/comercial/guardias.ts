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
