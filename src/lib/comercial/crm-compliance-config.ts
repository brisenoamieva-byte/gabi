/**
 * Umbrales de cumplimiento CRM pensados para asesores por comisión:
 * motivación y claridad, no castigo.
 *
 * nudge  → recordatorio amable (sigue trabajando)
 * coach  → invita a limpiar 1–2 leads, pero siempre puedes continuar
 *
 * No hay bloqueo de recorrido/cotizador: el prospecto nuevo es prioridad.
 */

export type ComplianceGateLevel = "ok" | "nudge" | "coach" | "pause";

export const getComplianceNudgeThreshold = (): number => {
  const raw = process.env.COMPLIANCE_NUDGE_OVERDUE?.trim();
  if (!raw) return 1;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

/** Umbral a partir del cual el mensaje pasa de nudge a coach (sigue permitiendo continuar). */
export const getComplianceRecorridoBlockThreshold = (): number => {
  const raw = process.env.COMPLIANCE_RECORRIDO_BLOCK_OVERDUE?.trim();
  if (!raw) return 3;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 3;
};

/**
 * @deprecated Ya no se usa para bloquear. Se mantiene por env/compat;
 * el gate máximo efectivo es "coach" con continuar siempre permitido.
 */
export const getCompliancePauseThreshold = (): number => {
  const raw = process.env.COMPLIANCE_PAUSE_OVERDUE?.trim();
  if (!raw) return 6;
  const parsed = Number(raw);
  const coach = getComplianceRecorridoBlockThreshold();
  if (!Number.isFinite(parsed) || parsed <= 0) return Math.max(6, coach + 2);
  return Math.max(Math.floor(parsed), coach + 1);
};

export const isComplianceServerEnforced = (): boolean =>
  process.env.COMPLIANCE_SERVER_ENFORCE?.trim() === "true";

export const resolveComplianceGateLevel = (overdueCount: number): ComplianceGateLevel => {
  if (overdueCount <= 0) return "ok";
  if (overdueCount < getComplianceRecorridoBlockThreshold()) return "nudge";
  // Nunca "pause": no limitamos atender prospectos nuevos por trabajo pendiente.
  return "coach";
};

export type ContactoResultadoRapido =
  | "respondio"
  | "sin_respuesta"
  | "cita"
  | "mensaje_enviado";

export const CONTACTO_RESULTADO_LABEL: Record<ContactoResultadoRapido, string> = {
  respondio: "Respondió",
  sin_respuesta: "Sin respuesta",
  cita: "Cita",
  mensaje_enviado: "Mensaje enviado",
};

export const isContactoResultadoRapido = (value: unknown): value is ContactoResultadoRapido =>
  value === "respondio" ||
  value === "sin_respuesta" ||
  value === "cita" ||
  value === "mensaje_enviado";
