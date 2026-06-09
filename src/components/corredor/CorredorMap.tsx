"use client";

import dynamic from "next/dynamic";
import type { CorredorDesarrollo } from "@/lib/corredor/types";
import { CorredorMapSchematic } from "@/components/corredor/CorredorMapSchematic";

const CorredorGoogleMap = dynamic(
  () =>
    import("@/components/corredor/CorredorGoogleMap").then((mod) => mod.CorredorGoogleMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 md:h-96">
        <p className="text-sm font-semibold text-slate-500">Cargando mapa…</p>
      </div>
    ),
  },
);

type CorredorMapProps = {
  desarrollos: CorredorDesarrollo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  singleDesarrolloId?: string;
};

export function CorredorMap({
  desarrollos,
  selectedId,
  onSelect,
  singleDesarrolloId,
}: CorredorMapProps) {
  return (
    <CorredorGoogleMap
      desarrollos={desarrollos}
      selectedId={selectedId}
      onSelect={onSelect}
      singleDesarrolloId={singleDesarrolloId}
    />
  );
}

export { CorredorMapSchematic };
