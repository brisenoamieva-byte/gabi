import type { AsesorRol } from "@/lib/asesores/types";

/** Tope de descuento especial en simuladores (gerente / director). */
export const DESCUENTO_ESPECIAL_MAX_PCT = 0.015;

/** Gerente y director pueden autorizar descuento especial en simuladores. */
export function canApplyDescuentoEspecial(
  rol: AsesorRol | string | null | undefined,
): boolean {
  const normalized = String(rol ?? "")
    .trim()
    .toLowerCase();
  return normalized === "gerente" || normalized === "director";
}

/** Clampa un porcentaje decimal (0–0.015). */
export function clampDescuentoEspecialPct(pct: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  return Math.min(DESCUENTO_ESPECIAL_MAX_PCT, pct);
}

/** Factor multiplicador sobre precios (1 = sin descuento). */
export function factorDescuentoEspecial(pct: number): number {
  return 1 - clampDescuentoEspecialPct(pct);
}

export function formatDescuentoEspecialPctLabel(pct: number): string {
  const clamped = clampDescuentoEspecialPct(pct);
  if (clamped <= 0) return "0%";
  const display = clamped * 100;
  const rounded = Math.round(display * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded}%`;
}
