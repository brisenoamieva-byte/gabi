import type { ReporteSemanalPeriodo } from "@/lib/admin/reporte-semanal/types";

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function formatDayLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return `${date.getUTCDate()} de ${MONTHS_ES[date.getUTCMonth()]}`;
}

export function formatPeriodoLabel(desde: string, hasta: string): string {
  const start = new Date(`${desde}T12:00:00`);
  const end = new Date(`${hasta}T12:00:00`);
  const year = end.getUTCFullYear();
  if (start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === year) {
    return `${start.getUTCDate()} al ${end.getUTCDate()} de ${MONTHS_ES[end.getUTCMonth()]} ${year}`;
  }
  return `${formatDayLabel(desde)} al ${formatDayLabel(hasta)} ${year}`;
}

/** Semana calendario lun–dom que contiene la fecha (UTC). */
export function defaultWeekContaining(reference = new Date()): ReporteSemanalPeriodo {
  const date = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
  const day = date.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const desde = monday.toISOString().slice(0, 10);
  const hasta = sunday.toISOString().slice(0, 10);
  return { desde, hasta, label: formatPeriodoLabel(desde, hasta) };
}

export function resolveReportePeriodo(desde?: string, hasta?: string): ReporteSemanalPeriodo {
  if (desde && hasta && desde <= hasta) {
    return { desde, hasta, label: formatPeriodoLabel(desde, hasta) };
  }
  return defaultWeekContaining();
}

export function monthRangeForDate(iso: string): { desde: string; hasta: string } {
  const date = new Date(`${iso}T12:00:00`);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return {
    desde: start.toISOString().slice(0, 10),
    hasta: end.toISOString().slice(0, 10),
  };
}

export function isDateInRange(value: string | null | undefined, desde: string, hasta: string) {
  if (!value) return false;
  const day = value.slice(0, 10);
  return day >= desde && day <= hasta;
}
