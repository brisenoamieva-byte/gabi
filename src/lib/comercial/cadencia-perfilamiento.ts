import { buildWhatsAppUrl } from "@/lib/visitas/follow-up";

export const CADENCIA_TIMEZONE = "America/Mexico_City";

export type CadenciaCanal = "whatsapp" | "llamada";

export type CadenciaStatus = "active" | "paused" | "completed" | "expired";

export type CadenciaTouchStatus = "pending" | "completed" | "skipped" | "paused" | "expired";

export type CadenciaTouchTemplate = {
  touchKey: string;
  dayOffset: number;
  sequenceInDay: number;
  canal: CadenciaCanal;
  label: string;
  /** Horas desde el inicio de la cadencia (solo D0 inmediatos). */
  dueHoursFromStart?: number;
  /** Ventana horaria sugerida (hora local México). */
  windowStartHour?: number;
  windowEndHour?: number;
  playbookStepId?: string;
};

/** Secuencia BBR: 10 toques en 8 días (días 2, 5 y 6 sin contacto). */
export const CADENCIA_TOUCH_TEMPLATES: CadenciaTouchTemplate[] = [
  {
    touchKey: "d0-wa",
    dayOffset: 0,
    sequenceInDay: 1,
    canal: "whatsapp",
    label: "WhatsApp de bienvenida",
    dueHoursFromStart: 1,
    playbookStepId: "whatsapp-inicial",
  },
  {
    touchKey: "d0-call",
    dayOffset: 0,
    sequenceInDay: 2,
    canal: "llamada",
    label: "Primera llamada (mismo día)",
    dueHoursFromStart: 2,
    windowStartHour: 12,
    windowEndHour: 17,
    playbookStepId: "llamada-d0",
  },
  {
    touchKey: "d1-call",
    dayOffset: 1,
    sequenceInDay: 1,
    canal: "llamada",
    label: "Llamada de seguimiento",
    windowStartHour: 12,
    windowEndHour: 14,
  },
  {
    touchKey: "d1-wa",
    dayOffset: 1,
    sequenceInDay: 2,
    canal: "whatsapp",
    label: "WhatsApp de seguimiento",
    windowStartHour: 17,
    windowEndHour: 19,
  },
  {
    touchKey: "d3-wa",
    dayOffset: 3,
    sequenceInDay: 1,
    canal: "whatsapp",
    label: "WhatsApp — reactivación",
    windowStartHour: 9,
    windowEndHour: 11,
  },
  {
    touchKey: "d3-call",
    dayOffset: 3,
    sequenceInDay: 2,
    canal: "llamada",
    label: "Llamada — reactivación",
    windowStartHour: 17,
    windowEndHour: 19,
  },
  {
    touchKey: "d4-call",
    dayOffset: 4,
    sequenceInDay: 1,
    canal: "llamada",
    label: "Llamada de insistencia",
    windowStartHour: 12,
    windowEndHour: 14,
  },
  {
    touchKey: "d4-wa",
    dayOffset: 4,
    sequenceInDay: 2,
    canal: "whatsapp",
    label: "WhatsApp de insistencia",
    windowStartHour: 17,
    windowEndHour: 19,
  },
  {
    touchKey: "d7-wa",
    dayOffset: 7,
    sequenceInDay: 1,
    canal: "whatsapp",
    label: "Último WhatsApp",
    windowStartHour: 9,
    windowEndHour: 11,
  },
  {
    touchKey: "d7-call",
    dayOffset: 7,
    sequenceInDay: 2,
    canal: "llamada",
    label: "Última llamada — cierre de cadencia",
    windowStartHour: 12,
    windowEndHour: 14,
  },
];

export const CADENCIA_REMINDER_HOURS = [9, 12, 17] as const;

type MexicoDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export const getMexicoCityParts = (date = new Date()): MexicoDateParts => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CADENCIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
};

/** Convierte fecha/hora local México a instante UTC. */
export const mexicoLocalToUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date => {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const asMexico = getMexicoCityParts(guess);
  const targetMs = Date.UTC(year, month - 1, day, hour, minute);
  const actualMs = Date.UTC(asMexico.year, asMexico.month - 1, asMexico.day, asMexico.hour, asMexico.minute);
  const offsetMs = targetMs - actualMs;
  return new Date(guess.getTime() + offsetMs);
};

export const addMexicoDays = (start: Date, dayOffset: number): MexicoDateParts => {
  const base = getMexicoCityParts(start);
  const utcMidnight = mexicoLocalToUtc(base.year, base.month, base.day + dayOffset, 0, 0);
  return getMexicoCityParts(utcMidnight);
};

export const computeTouchDueAt = (startedAt: Date, template: CadenciaTouchTemplate): Date => {
  if (template.dueHoursFromStart != null) {
    return new Date(startedAt.getTime() + template.dueHoursFromStart * 60 * 60 * 1000);
  }

  const target = addMexicoDays(startedAt, template.dayOffset);
  const hour = template.windowStartHour ?? 9;
  return mexicoLocalToUtc(target.year, target.month, target.day, hour, 0);
};

export const formatCadenciaWindow = (template: CadenciaTouchTemplate): string => {
  if (template.dueHoursFromStart != null && template.windowStartHour == null) {
    return template.dueHoursFromStart <= 1 ? "Inmediato" : `~${template.dueHoursFromStart} h desde el lead`;
  }

  if (template.windowStartHour != null && template.windowEndHour != null) {
    return `${template.windowStartHour}:00–${template.windowEndHour}:00`;
  }

  return "Hoy";
};

export type CadenciaScriptContext = {
  prospectNombre: string;
  desarrolloNombre: string;
  asesorNombre: string;
  touchLabel: string;
  dayOffset: number;
};

export const buildCadenciaWhatsAppScript = (ctx: CadenciaScriptContext): string => {
  const firstName = ctx.prospectNombre.split(" ")[0] || ctx.prospectNombre;

  if (ctx.dayOffset === 0) {
    return [
      `Hola ${firstName}, soy ${ctx.asesorNombre} de ${ctx.desarrolloNombre}.`,
      "",
      "Vi tu interés en nuestro desarrollo. ¿Te gustaría agendar una visita para conocerlo en persona?",
      "",
      "Con gusto te comparto horarios disponibles.",
    ].join("\n");
  }

  if (ctx.dayOffset >= 7) {
    return [
      `Hola ${firstName}, ${ctx.asesorNombre} de ${ctx.desarrolloNombre}.`,
      "",
      "Este es mi último mensaje por ahora. Si aún te interesa conocer el desarrollo, con gusto agendamos una visita cuando te quede bien.",
      "",
      "¡Que tengas excelente día!",
    ].join("\n");
  }

  return [
    `Hola ${firstName}, te escribe ${ctx.asesorNombre} de ${ctx.desarrolloNombre}.`,
    "",
    "¿Seguimos en contacto? Me encantaría invitarte a conocer el desarrollo en una visita guiada.",
    "",
    "¿Qué día y horario te funcionaría?",
  ].join("\n");
};

export const buildCadenciaLlamadaGuion = (ctx: CadenciaScriptContext): string => {
  const firstName = ctx.prospectNombre.split(" ")[0] || ctx.prospectNombre;

  return [
    `Guion — ${ctx.touchLabel}`,
    `Prospecto: ${ctx.prospectNombre}`,
    "",
    `«Hola ${firstName}, soy ${ctx.asesorNombre} de ${ctx.desarrolloNombre}.`,
    "Te llamo porque recibimos tu solicitud de información.",
    "¿Tienes un momento? Me gustaría invitarte a visitar el desarrollo — es la mejor forma de conocerlo.",
    "¿Qué día te funcionaría?»",
    "",
    "Si no contesta: dejar buzón breve con nombre, desarrollo e invitación a visita.",
  ].join("\n");
};

export const buildCadenciaWhatsAppUrl = (
  telefono: string,
  ctx: CadenciaScriptContext,
): string | null => {
  const message = buildCadenciaWhatsAppScript(ctx);
  return buildWhatsAppUrl(telefono, message);
};

export const buildCadenciaTelUrl = (telefono: string): string | null => {
  const digits = telefono.replace(/\D/g, "");
  if (!digits) {
    return null;
  }
  const withCountry =
    digits.length === 10 ? `52${digits}` : digits.startsWith("52") ? digits : `52${digits}`;
  return `tel:+${withCountry}`;
};

export const isTouchDueToday = (dueAt: Date, now = new Date()): boolean => {
  const due = getMexicoCityParts(dueAt);
  const today = getMexicoCityParts(now);
  return due.year === today.year && due.month === today.month && due.day === today.day;
};

export const isTouchOverdue = (dueAt: Date, now = new Date()): boolean => {
  if (dueAt.getTime() > now.getTime()) {
    return false;
  }
  return !isTouchDueToday(dueAt, now);
};

export const isInReminderWindow = (hour: number): boolean =>
  (CADENCIA_REMINDER_HOURS as readonly number[]).includes(hour);

export const getCadenciaDayIndex = (startedAt: Date, now = new Date()): number => {
  const start = getMexicoCityParts(startedAt);
  const current = getMexicoCityParts(now);
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const currentUtc = Date.UTC(current.year, current.month - 1, current.day);
  return Math.floor((currentUtc - startUtc) / (24 * 60 * 60 * 1000));
};

export const PLAYBOOK_DEMO_LEAD_EMAIL = "demo.playbook@gabi.mx";
export const PLAYBOOK_DEMO_LEAD_NOMBRE = "Demo Playbook GABI";

export const isPlaybookDemoLead = (lead: {
  email?: string | null;
  nombre?: string | null;
}): boolean =>
  lead.email === PLAYBOOK_DEMO_LEAD_EMAIL || lead.nombre === PLAYBOOK_DEMO_LEAD_NOMBRE;
