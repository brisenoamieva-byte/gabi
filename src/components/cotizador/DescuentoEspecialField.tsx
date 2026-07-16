"use client";

import {
  canApplyDescuentoEspecial,
  DESCUENTO_ESPECIAL_MAX_PCT,
  formatDescuentoEspecialPctLabel,
} from "@/lib/comercial/descuento-especial";
import type { AsesorRol } from "@/lib/asesores/types";

type DescuentoEspecialFieldProps = {
  asesorRol?: AsesorRol | string | null;
  /** Fracción decimal 0–0.015. */
  value: number;
  onChange: (pct: number) => void;
  /** Acento del simulador (Gavia / Pasaje). */
  accent?: "gavia" | "pasaje";
};

/**
 * Campo de descuento especial (máx. 1.5%) visible solo para gerente y director.
 * El valor interno es fracción (0.015 = 1.5%); el input muestra puntos porcentuales.
 */
export function DescuentoEspecialField({
  asesorRol,
  value,
  onChange,
  accent = "gavia",
}: DescuentoEspecialFieldProps) {
  if (!canApplyDescuentoEspecial(asesorRol)) {
    return null;
  }

  const maxDisplay = DESCUENTO_ESPECIAL_MAX_PCT * 100;
  const displayValue =
    value > 0 ? Math.round(value * 10000) / 100 : "";
  const ring =
    accent === "pasaje"
      ? "ring-slate-200 focus-within:ring-[#242E38]/30"
      : "ring-[#5B8A7D]/25 focus-within:ring-[#14453D]/30";
  const labelColor = accent === "pasaje" ? "text-slate-500" : "text-slate-500";

  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${ring}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[11px] font-bold uppercase tracking-[0.14em] ${labelColor}`}
          >
            Descuento especial
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Solo gerente o director · máximo {formatDescuentoEspecialPctLabel(DESCUENTO_ESPECIAL_MAX_PCT)}.
            Recalcula enganche, mensualidades y finiquito.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={maxDisplay}
            step={0.1}
            inputMode="decimal"
            value={displayValue}
            placeholder="0"
            onChange={(e) => {
              const raw = Number(e.target.value);
              if (!Number.isFinite(raw) || raw <= 0) {
                onChange(0);
                return;
              }
              onChange(Math.min(DESCUENTO_ESPECIAL_MAX_PCT, raw / 100));
            }}
            className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-right text-sm font-bold tabular-nums text-slate-800 outline-none focus:border-slate-400"
            aria-label="Descuento especial en porcentaje"
          />
          <span className="text-sm font-bold text-slate-500">%</span>
          {value > 0 ? (
            <button
              type="button"
              onClick={() => onChange(0)}
              className="text-[11px] font-semibold text-slate-500 underline-offset-2 hover:underline"
            >
              Quitar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
