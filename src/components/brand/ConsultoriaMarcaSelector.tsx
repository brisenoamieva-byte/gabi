"use client";

import {
  CONSULTORIA_MARCA_LABELS,
  type ConsultoriaMarcaPresentacion,
} from "@/lib/brand/consultoria-marca";

type Props = {
  value: ConsultoriaMarcaPresentacion;
  onChange: (marca: ConsultoriaMarcaPresentacion) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

const OPTIONS: ConsultoriaMarcaPresentacion[] = ["bbr", "dmb"];

export function ConsultoriaMarcaSelector({
  value,
  onChange,
  disabled = false,
  compact = false,
  className = "",
}: Props) {
  return (
    <div
      className={`inline-flex flex-col gap-1 ${className}`.trim()}
      role="group"
      aria-label="Marca de presentación"
    >
      {!compact ? (
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Presentar como
        </span>
      ) : null}
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        {OPTIONS.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                active ?
                  option === "dmb" ?
                    "bg-dmb-ink text-white shadow-sm"
                  : "bg-[#201044] text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              {CONSULTORIA_MARCA_LABELS[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
