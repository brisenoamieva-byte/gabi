"use client";

import type { CorredorDesarrollo } from "@/lib/corredor/types";

type CorredorMapSchematicProps = {
  desarrollos: CorredorDesarrollo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  kmMax?: number;
};

const KM_MAX_DEFAULT = 20;

export function CorredorMapSchematic({
  desarrollos,
  selectedId,
  onSelect,
  kmMax = KM_MAX_DEFAULT,
}: CorredorMapSchematicProps) {
  const conKm = desarrollos.filter((d) => d.kmCorredor !== null);

  return (
    <div className="rounded-2xl border border-[#201044]/10 bg-gradient-to-b from-[#F2F0E9] to-white p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#201044]/50">
            Corredor sur
          </p>
          <h3 className="text-lg font-black text-[#201044]">Blvd. Metropolitano → 413</h3>
        </div>
        <p className="text-xs text-slate-500">
          {conKm.length} en mapa · {desarrollos.length - conKm.length} por Noria
        </p>
      </div>

      <div className="relative h-36 overflow-hidden rounded-xl bg-[#201044]/[0.04] md:h-44">
        <div className="absolute inset-x-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#201044]/15" />
        <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between text-[9px] font-semibold text-slate-400">
          <span>km 0</span>
          <span>Corregidora</span>
          <span>km {kmMax}</span>
        </div>

        {conKm.map((d) => {
          const left = `${Math.min(96, Math.max(4, ((d.kmCorredor ?? 0) / kmMax) * 100))}%`;
          const active = selectedId === d.id;
          return (
            <button
              key={d.id}
              type="button"
              title={`${d.nombre} · ${d.kmLabel}`}
              onClick={() => onSelect(d.id)}
              style={{ left }}
              className={`absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transition ${active ? "scale-110" : "hover:scale-105"}`}
            >
              <span
                className={`block h-4 w-4 rounded-full border-2 shadow-sm ${
                  active
                    ? "border-[#201044] bg-[#6cc24a]"
                    : "border-white bg-[#201044]/70"
                }`}
              />
              <span
                className={`mt-1 block max-w-[4.5rem] truncate text-center text-[9px] font-bold leading-tight ${active ? "text-[#201044]" : "text-slate-600"}`}
              >
                {d.nombre.split(" ").slice(0, 2).join(" ")}
              </span>
            </button>
          );
        })}
      </div>

      {desarrollos.some((d) => d.kmCorredor === null) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {desarrollos
            .filter((d) => d.kmCorredor === null)
            .map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  selectedId === d.id
                    ? "border-[#201044] bg-[#201044] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#201044]/20"
                }`}
              >
                {d.nombre} · {d.kmLabel}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
