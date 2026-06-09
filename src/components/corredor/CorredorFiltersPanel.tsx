"use client";

import { useMemo } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  FilterDualRangeSlider,
  FilterRangeSlider,
  formatEnganche,
  formatKm,
  formatM2,
  formatMensualidad,
  formatPrecioM2,
  formatTicketShort,
} from "@/components/corredor/FilterSliders";
import {
  CORREDOR_DESARROLLADORES,
  CORREDOR_DESARROLLOS,
} from "@/lib/corredor/zona-sur-seed";
import {
  countActiveSliderFilters,
  FILTER_BOUNDS,
  filtersToSliderValues,
  mergeFiltersWithSliders,
  type CorredorSliderValues,
} from "@/lib/corredor/filter-ranges";
import { DEFAULT_CORREDOR_FILTERS } from "@/lib/corredor/filters";
import type {
  CorredorAmenidadTag,
  CorredorCarretera,
  CorredorFilters,
} from "@/lib/corredor/types";

const AMENIDAD_OPTIONS: { tag: CorredorAmenidadTag; label: string }[] = [
  { tag: "huerto-urbano", label: "Huerto urbano" },
  { tag: "lago", label: "Lago" },
  { tag: "padel", label: "Pádel" },
  { tag: "alberca", label: "Alberca" },
  { tag: "pet-park", label: "Pet park" },
  { tag: "bike-park", label: "Bike park" },
  { tag: "hipico", label: "Hípico" },
  { tag: "area-comercial", label: "Comercial" },
  { tag: "coworking", label: "Coworking" },
  { tag: "camping", label: "Camping" },
];

const CARRETERA_OPTIONS: { value: CorredorCarretera | null; label: string }[] = [
  { value: null, label: "Todas" },
  { value: "metropolitano", label: "Metropolitano" },
  { value: "noria", label: "Noria" },
  { value: "413", label: "413" },
];

type CorredorFiltersPanelProps = {
  filters: CorredorFilters;
  onChange: (filters: CorredorFilters) => void;
  resultCount: number;
};

export function CorredorFiltersPanel({
  filters,
  onChange,
  resultCount,
}: CorredorFiltersPanelProps) {
  const sliders = useMemo(() => filtersToSliderValues(filters), [filters]);
  const active = countActiveSliderFilters(sliders, filters);

  const updateSliders = (
    patch: Partial<CorredorSliderValues>,
    extra?: Partial<CorredorFilters>,
  ) => {
    const nextSliders = { ...sliders, ...patch };
    onChange(
      mergeFiltersWithSliders(nextSliders, {
        desarrolladorId: filters.desarrolladorId,
        carretera: filters.carretera,
        amenidadTags: filters.amenidadTags,
        ...extra,
      }),
    );
  };

  const reset = () => onChange({ ...DEFAULT_CORREDOR_FILTERS });

  const toggleAmenidad = (tag: CorredorAmenidadTag) => {
    const next = filters.amenidadTags.includes(tag)
      ? filters.amenidadTags.filter((t) => t !== tag)
      : [...filters.amenidadTags, tag];
    onChange({ ...filters, amenidadTags: next });
  };

  return (
    <aside className="rounded-2xl border border-slate-200/90 bg-white shadow-sm md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto">
      <div className="border-b border-slate-100 p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#201044]/6 text-[#201044]">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-black text-[#201044]">Perfil del prospecto</h2>
              <p className="text-xs text-slate-500">
                <span className="font-bold text-[#6cc24a]">{resultCount}</span> de{" "}
                {CORREDOR_DESARROLLOS.length} desarrollos
              </p>
            </div>
          </div>
          {active > 0 ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-[#201044]/20"
            >
              <RotateCcw className="h-3 w-3" />
              Limpiar
            </button>
          ) : null}
        </div>
        {active > 0 ? (
          <p className="mt-2 text-[10px] font-semibold text-[#201044]/60">
            {active} criterio{active === 1 ? "" : "s"} activo{active === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 p-4 md:p-5 md:pt-4">
        <FilterDualRangeSlider
          label="Tamaño de lote"
          min={FILTER_BOUNDS.lote.min}
          max={FILTER_BOUNDS.lote.max}
          step={FILTER_BOUNDS.lote.step}
          valueMin={sliders.loteMinM2}
          valueMax={sliders.loteMaxM2}
          onChange={(loteMinM2, loteMaxM2) => updateSliders({ loteMinM2, loteMaxM2 })}
          formatValue={formatM2}
        />

        <FilterDualRangeSlider
          label="Precio por m²"
          min={FILTER_BOUNDS.precioM2.min}
          max={FILTER_BOUNDS.precioM2.max}
          step={FILTER_BOUNDS.precioM2.step}
          valueMin={sliders.precioM2Min}
          valueMax={sliders.precioM2Max}
          onChange={(precioM2Min, precioM2Max) =>
            updateSliders({ precioM2Min, precioM2Max })
          }
          formatValue={formatPrecioM2}
        />

        <FilterRangeSlider
          label="Presupuesto máximo (ticket)"
          min={FILTER_BOUNDS.ticket.min}
          max={FILTER_BOUNDS.ticket.max}
          step={FILTER_BOUNDS.ticket.step}
          value={sliders.ticketMax}
          onChange={(ticketMax) => updateSliders({ ticketMax })}
          formatValue={formatTicketShort}
          hint="Desde el precio publicado de cada desarrollo"
        />

        <FilterRangeSlider
          label="Mensualidad máxima (est.)"
          min={FILTER_BOUNDS.mensualidad.min}
          max={FILTER_BOUNDS.mensualidad.max}
          step={FILTER_BOUNDS.mensualidad.step}
          value={sliders.mensualidadMax}
          onChange={(mensualidadMax) => updateSliders({ mensualidadMax })}
          formatValue={formatMensualidad}
          hint="Enganche 15% · 60 meses (referencia)"
        />

        <FilterRangeSlider
          label="Enganche máximo"
          min={FILTER_BOUNDS.enganche.min}
          max={FILTER_BOUNDS.enganche.max}
          step={FILTER_BOUNDS.enganche.step}
          value={sliders.engancheMaxPct}
          onChange={(engancheMaxPct) => updateSliders({ engancheMaxPct })}
          formatValue={formatEnganche}
        />

        <FilterDualRangeSlider
          label="Km en corredor"
          min={FILTER_BOUNDS.km.min}
          max={FILTER_BOUNDS.km.max}
          step={FILTER_BOUNDS.km.step}
          valueMin={sliders.kmMin}
          valueMax={sliders.kmMax}
          onChange={(kmMin, kmMax) => updateSliders({ kmMin, kmMax })}
          formatValue={formatKm}
        />

        <div className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Vía de acceso
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CARRETERA_OPTIONS.map(({ value, label }) => {
              const on = filters.carretera === value;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChange({ ...filters, carretera: value })}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    on
                      ? "bg-[#201044] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-[#201044]/15"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Desarrollador
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ ...filters, desarrolladorId: null })}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                !filters.desarrolladorId
                  ? "bg-[#201044] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              Todos
            </button>
            {CORREDOR_DESARROLLADORES.map((d) => {
              const on = filters.desarrolladorId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...filters,
                      desarrolladorId: on ? null : d.id,
                    })
                  }
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    on
                      ? "bg-[#201044] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-[#201044]/15"
                  }`}
                >
                  {d.nombre}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Amenidades
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {AMENIDAD_OPTIONS.map(({ tag, label }) => {
              const on = filters.amenidadTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleAmenidad(tag)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    on
                      ? "border-[#6cc24a] bg-[#6cc24a]/20 text-[#201044] ring-1 ring-[#6cc24a]/40"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-[#201044]/15"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
