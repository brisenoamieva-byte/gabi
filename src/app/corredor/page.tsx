"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import { CorredorDesarrolloCard } from "@/components/corredor/CorredorDesarrolloCard";
import { CorredorFiltersPanel } from "@/components/corredor/CorredorFiltersPanel";
import { CorredorInmobiliariaBanner } from "@/components/corredor/CorredorInmobiliariaBanner";
import { CorredorMap } from "@/components/corredor/CorredorMap";
import { CorredorMetrajeRangeChart } from "@/components/corredor/CorredorMetrajeRangeChart";
import { CorredorZonaContextoPanel } from "@/components/corredor/CorredorZonaContextoPanel";
import { CORREDOR_INMOBILIARIA } from "@/lib/corredor/inmobiliaria";
import { CORREDOR_DATOS_ACTUALIZADOS } from "@/lib/corredor/contexto-mercado";
import {
  DEFAULT_CORREDOR_FILTERS,
  filterCorredorDesarrollos,
} from "@/lib/corredor/filters";
import { useResolvedCorredorCatalog } from "@/lib/corredor/use-resolved-corredor-catalog";
import { useRequireAsesorSession } from "@/lib/session/useRequireAsesorSession";

export default function CorredorPage() {
  const { authReady } = useRequireAsesorSession({ requireDesarrollo: false });
  const { desarrollos, loading: catalogLoading } = useResolvedCorredorCatalog();
  const [filters, setFilters] = useState(DEFAULT_CORREDOR_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterCorredorDesarrollos(desarrollos, filters),
    [desarrollos, filters],
  );

  const sorted = useMemo(() => {
    return [...filtered].sort(
      (a, b) => (a.kmCorredor ?? 99) - (b.kmCorredor ?? 99),
    );
  }, [filtered]);

  if (!authReady || catalogLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-[#201044]">
        <p className="text-lg font-semibold">Cargando corredor sur...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#201044]">
      <header className="border-b border-black/8 bg-white px-5 py-4 shadow-sm md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#201044]"
              aria-label="Volver al dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <GabiSistemaMark size="sm" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#201044]/50">
                {CORREDOR_INMOBILIARIA.nombre}
              </p>
              <h1 className="truncate text-lg font-black md:text-xl">Corredor Metropolitano</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pt-6 md:px-10">
        <CorredorInmobiliariaBanner />
      </div>

      <div className="mx-auto max-w-6xl px-5 pt-4 md:px-10">
        <Link
          href="/corredor/investti"
          className="flex flex-wrap items-center justify-between gap-4 border border-[#201044]/15 bg-[#FDFCFA] p-5 transition hover:border-[#201044]/30"
        >
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
              Grupo Investti
            </p>
            <h2 className="mt-1 font-[Georgia,'Times_New_Roman',serif] text-lg text-[#1C1830] md:text-xl">
              Metraje recomendado — nueva etapa Cañadas del Valle
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
              Propuesta BBR para nueva etapa · {CORREDOR_DATOS_ACTUALIZADOS}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 border border-[#201044]/20 px-4 py-2 text-sm text-[#201044]">
            Ver documento
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </span>
        </Link>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-5 pt-6 md:px-10">
        <CorredorZonaContextoPanel />
        <CorredorMetrajeRangeChart
          desarrollos={sorted}
          selectedId={selectedId}
        />
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 md:grid-cols-[minmax(17rem,20rem)_1fr] md:px-10 md:pb-8">
        <CorredorFiltersPanel
          filters={filters}
          onChange={setFilters}
          resultCount={sorted.length}
        />

        <div className="space-y-6">
          <CorredorMap
            desarrollos={sorted}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id || null)}
          />

          <div className="space-y-4">
            <h2 className="text-sm font-black">
              Desarrollos ({sorted.length})
            </h2>
            {sorted.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                Ningún desarrollo coincide con los filtros. Ajusta criterios o limpia filtros.
              </p>
            ) : (
              sorted.map((d) => (
                <CorredorDesarrolloCard
                  key={d.id}
                  desarrollo={d}
                  selected={selectedId === d.id}
                  onSelect={() => setSelectedId(d.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
