import type { GuardiaMarcajeTipo } from "@/lib/comercial/guardia-marcaje-types";
import type { GuardiaTurno } from "@/lib/comercial/guardias";

export type GuardiaMarcajeRef = {
  turno: string;
  tipo: string;
};

export type GuardiaCorridaEstado = "en_curso" | "completa" | null;

export function hasGuardiaMarcaje(
  marcajes: GuardiaMarcajeRef[],
  turno: GuardiaTurno,
  tipo: GuardiaMarcajeTipo,
): boolean {
  return marcajes.some((item) => item.turno === turno && item.tipo === tipo);
}

/** Entrada matutina + salida vespertina del mismo día = ambas jornadas cubiertas. */
export function isGuardiaCorridaCompleta(marcajes: GuardiaMarcajeRef[]): boolean {
  return (
    hasGuardiaMarcaje(marcajes, "matutino", "entrada") &&
    hasGuardiaMarcaje(marcajes, "vespertino", "salida")
  );
}

/**
 * Permite salida vespertina sin entrada de ese turno cuando la corrida
 * sigue abierta (entró en matutino y todavía no cerró el matutino).
 */
export function canSalidaVespertinoPorCorrida(marcajes: GuardiaMarcajeRef[]): boolean {
  return (
    hasGuardiaMarcaje(marcajes, "matutino", "entrada") &&
    !hasGuardiaMarcaje(marcajes, "matutino", "salida")
  );
}

export function resolveGuardiaCorridaEstado(
  marcajes: GuardiaMarcajeRef[],
): GuardiaCorridaEstado {
  if (isGuardiaCorridaCompleta(marcajes)) {
    return "completa";
  }
  if (canSalidaVespertinoPorCorrida(marcajes)) {
    return "en_curso";
  }
  return null;
}

/**
 * Pendiente por turno, respetando guardia corrida:
 * - Matutino: se puede cerrar con su propia salida o quedar cubierto por salida vespertina.
 * - Vespertino: si hay entrada matutina sin salida matutina, pide salida (sin exigir entrada).
 */
export function resolvePendienteConCorrida(
  turno: GuardiaTurno,
  entrada: boolean,
  salida: boolean,
  dayMarcajes: GuardiaMarcajeRef[],
): GuardiaMarcajeTipo | null {
  const corridaCompleta = isGuardiaCorridaCompleta(dayMarcajes);

  if (turno === "matutino") {
    if (salida || corridaCompleta) {
      return null;
    }
    if (!entrada) {
      return "entrada";
    }
    return "salida";
  }

  if (salida || corridaCompleta) {
    return null;
  }
  if (entrada) {
    return "salida";
  }
  if (canSalidaVespertinoPorCorrida(dayMarcajes)) {
    return "salida";
  }
  return "entrada";
}
