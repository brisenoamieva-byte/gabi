"use client";

import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { CorredorMapEmbed } from "@/components/corredor/CorredorMapEmbed";
import { CorredorMapLogoPin } from "@/components/corredor/CorredorMapLogoPin";
import { getDesarrolloLogoUrl } from "@/lib/corredor/desarrollo-logos";
import {
  latLngToBoundsPercent,
  resolveMapOverlayBounds,
} from "@/lib/corredor/map-projection";
import { resolvePublicAssetUrl } from "@/lib/public-asset-url";
import type { CorredorDesarrollo } from "@/lib/corredor/types";

export type CorredorMapMarker = {
  desarrollo: CorredorDesarrollo;
  lat: number;
  lng: number;
  aproximada: boolean;
};

type CorredorMapPinnedViewProps = {
  center: { lat: number; lng: number };
  zoom: number;
  markers: CorredorMapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  singleDesarrolloId?: string;
  className?: string;
};

export function CorredorMapPinnedView({
  center,
  zoom,
  markers,
  selectedId,
  onSelect,
  singleDesarrolloId,
  className = "",
}: CorredorMapPinnedViewProps) {
  const bounds = resolveMapOverlayBounds(center, zoom, Boolean(singleDesarrolloId));
  const selected = markers.find((m) => m.desarrollo.id === selectedId);

  return (
    <div className={className}>
      <div className="relative">
        <CorredorMapEmbed lat={center.lat} lng={center.lng} zoom={zoom} lockView />
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          aria-hidden={false}
        >
          {markers.map((marker) => {
            const { left, top } = latLngToBoundsPercent(marker.lat, marker.lng, bounds);
            return (
              <div key={marker.desarrollo.id} className="pointer-events-auto">
                <CorredorMapLogoPin
                  desarrollo={marker.desarrollo}
                  left={left}
                  top={top}
                  active={selectedId === marker.desarrollo.id}
                  aproximada={marker.aproximada}
                  onSelect={() => onSelect(marker.desarrollo.id)}
                />
              </div>
            );
          })}
        </div>
        <a
          href={`https://www.google.com/maps/@${center.lat},${center.lng},${zoom}z`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-2 top-2 z-30 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] font-bold text-[#201044] shadow-sm ring-1 ring-black/10 backdrop-blur hover:bg-white"
        >
          <ExternalLink className="h-3 w-3" />
          Abrir en Maps
        </a>
      </div>

      {selected && !singleDesarrolloId ? (
        <div className="mt-3 rounded-xl border border-[#201044]/10 bg-white p-3 shadow-sm">
          <div className="flex items-start gap-3">
            {getDesarrolloLogoUrl(selected.desarrollo) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvePublicAssetUrl(getDesarrolloLogoUrl(selected.desarrollo)!)}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-white object-contain p-0.5"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[#201044]">{selected.desarrollo.nombre}</p>
              <p className="text-xs text-slate-600">
                {selected.desarrollo.kmLabel} · {selected.desarrollo.desarrollador}
              </p>
              {selected.aproximada ? (
                <p className="mt-1 text-[10px] text-amber-700">Ubicación aproximada</p>
              ) : null}
            </div>
            <Link
              href={`/corredor/${selected.desarrollo.id}`}
              className="shrink-0 text-xs font-bold text-[#6cc24a]"
            >
              Ver ficha →
            </Link>
          </div>
        </div>
      ) : null}

      {markers.some((m) => m.aproximada) && !singleDesarrolloId ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3 w-3 shrink-0" />
          Pines con borde tenue: ubicación aproximada. Toca un logo para ver la ficha.
        </p>
      ) : null}
    </div>
  );
}
