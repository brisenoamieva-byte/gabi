"use client";

import { useMemo, useState } from "react";
import mexicoMap from "@svg-maps/mexico";
import {
  mexicoEstadoNombre,
  type MexicoEstadoId,
} from "@/lib/comercial/mexico-estados";

const FOREST = "#1a4d3e";
const MINT = "#6cc24a";
const SAND = "#c4a574";
const EMPTY = "#e2e8f0";

export type LeadsEstadoCount = {
  estadoId: MexicoEstadoId;
  estadoNombre: string;
  total: number;
};

type LeadsMexicoMapProps = {
  estados: LeadsEstadoCount[];
};

export function LeadsMexicoMap({ estados }: LeadsMexicoMapProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const countById = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of estados) {
      if (item.estadoId === "unk" || item.estadoId === "ext") continue;
      map.set(item.estadoId, (map.get(item.estadoId) ?? 0) + item.total);
    }
    return map;
  }, [estados]);

  const max = useMemo(() => Math.max(...Array.from(countById.values()), 1), [countById]);

  const fillFor = (id: string) => {
    const count = countById.get(id) ?? 0;
    if (!count) return EMPTY;
    const t = count / max;
    if (t > 0.66) return FOREST;
    if (t > 0.33) return MINT;
    return SAND;
  };

  const hoverEntry = hoverId ? countById.get(hoverId) : undefined;
  const hoverName =
    hoverId &&
    mexicoMap.locations.find((loc: { id: string; name: string }) => loc.id === hoverId)?.name;

  const sinMapear = estados.find((e) => e.estadoId === "unk")?.total ?? 0;
  const extranjero = estados.find((e) => e.estadoId === "ext")?.total ?? 0;
  const mappedTotal = Array.from(countById.values()).reduce((sum, n) => sum + n, 0);

  if (!mappedTotal && !sinMapear && !extranjero) {
    return (
      <p className="flex h-full min-h-[280px] items-center justify-center text-sm text-slate-500">
        Sin datos geográficos en el periodo (origen_ciudad).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="relative flex-1">
        <svg
          viewBox={mexicoMap.viewBox}
          className="mx-auto w-full max-w-2xl"
          role="img"
          aria-label="Mapa de México con volumen de leads por estado"
        >
          {mexicoMap.locations.map((location: { id: string; name: string; path: string }) => (
              <path
                key={location.id}
                id={location.id}
                d={location.path}
                fill={fillFor(location.id)}
                stroke="#fff"
                strokeWidth={0.6}
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseEnter={() => setHoverId(location.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <title>{`${location.name}: ${countById.get(location.id) ?? 0} lead${(countById.get(location.id) ?? 0) === 1 ? "" : "s"}`}</title>
              </path>
            ))}
        </svg>

        {hoverId ? (
          <div className="pointer-events-none absolute left-3 top-3 rounded-xl border border-gabi-forest/15 bg-white/95 px-3 py-2 text-sm shadow-md">
            <p className="font-bold text-gabi-forest">{hoverName ?? hoverId}</p>
            <p className="tabular-nums text-slate-600">
              {hoverEntry ?? 0} lead{(hoverEntry ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
        ) : null}
      </div>

      <div className="w-full shrink-0 space-y-3 lg:w-56">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Leyenda</p>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-3 w-6 rounded" style={{ background: SAND }} />
          Bajo
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-3 w-6 rounded" style={{ background: MINT }} />
          Medio
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-3 w-6 rounded" style={{ background: FOREST }} />
          Alto
        </div>
        <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
          <p>
            <span className="font-semibold text-gabi-forest">{mappedTotal}</span> leads mapeados
          </p>
          {sinMapear ? (
            <p className="mt-1">
              {sinMapear} sin mapear ({mexicoEstadoNombre("unk")})
            </p>
          ) : null}
          {extranjero ? (
            <p className="mt-1">
              {extranjero} {mexicoEstadoNombre("ext").toLowerCase()}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
