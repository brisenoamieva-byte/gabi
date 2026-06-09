"use client";

type FilterRangeSliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  hint?: string;
};

export function FilterRangeSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatValue,
  hint,
}: FilterRangeSliderProps) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <span className="text-sm font-black tabular-nums text-[#201044]">
          {formatValue(value)}
        </span>
      </div>
      <div className="relative pt-1">
        <div className="absolute left-0 right-0 top-[0.65rem] h-1.5 rounded-full bg-slate-200" />
        <div
          className="absolute left-0 top-[0.65rem] h-1.5 rounded-full bg-[#6cc24a]"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#201044] [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#201044] [&::-webkit-slider-thumb]:shadow-md"
          aria-label={label}
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] font-medium text-slate-400">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
      {hint ? <p className="mt-1.5 text-[10px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

type FilterDualRangeSliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  formatValue: (value: number) => string;
};

export function FilterDualRangeSlider({
  label,
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
  formatValue,
}: FilterDualRangeSliderProps) {
  const safeMin = Math.min(valueMin, valueMax);
  const safeMax = Math.max(valueMin, valueMax);
  const leftPct = max > min ? ((safeMin - min) / (max - min)) * 100 : 0;
  const widthPct = max > min ? ((safeMax - safeMin) / (max - min)) * 100 : 100;

  const handleMin = (next: number) => {
    onChange(Math.min(next, safeMax), safeMax);
  };

  const handleMax = (next: number) => {
    onChange(safeMin, Math.max(next, safeMin));
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <span className="text-xs font-black tabular-nums text-[#201044]">
          {formatValue(safeMin)} – {formatValue(safeMax)}
        </span>
      </div>
      <div className="relative h-8">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#6cc24a]"
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeMin}
          onChange={(e) => handleMin(Number(e.target.value))}
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-8 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#201044] [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#201044] [&::-webkit-slider-thumb]:shadow-md"
          aria-label={`${label} mínimo`}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeMax}
          onChange={(e) => handleMax(Number(e.target.value))}
          className="pointer-events-none absolute inset-x-0 top-0 z-30 h-8 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#201044] [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#201044] [&::-webkit-slider-thumb]:shadow-md"
          aria-label={`${label} máximo`}
        />
      </div>
      <div className="flex justify-between text-[9px] font-medium text-slate-400">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

export function formatM2(value: number): string {
  return `${value.toLocaleString("es-MX")} m²`;
}

export function formatKm(value: number): string {
  return `km ${value.toLocaleString("es-MX", { maximumFractionDigits: 1 })}`;
}

export function formatPrecioM2(value: number): string {
  return `$${value.toLocaleString("es-MX")}/m²`;
}

export function formatTicketShort(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(2)}M`;
  }
  return `$${Math.round(value / 1000)}K`;
}

export function formatMensualidad(value: number): string {
  return `$${value.toLocaleString("es-MX")}/mes`;
}

export function formatEnganche(value: number): string {
  return `hasta ${value}%`;
}
