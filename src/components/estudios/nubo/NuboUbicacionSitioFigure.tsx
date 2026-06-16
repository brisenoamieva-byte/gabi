"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import {
  DEFAULT_NUBO_UBICACION_MARCADORES,
  NUBO_UBICACION_MAP_ASPECT,
  NUBO_UBICACION_MARKER_CONFIG,
  normalizeNuboUbicacionMarcadores,
  type NuboUbicacionMarcador,
  type NuboUbicacionMarcadores,
  type NuboUbicacionMarkerId,
} from "@/lib/estudios/nubo-ubicacion-markers";
import { refitAllPropuestaSlides } from "@/lib/propuestas/propuesta-slide-fit";

type Props = {
  src: string;
  alt?: string;
  marcadores?: Partial<NuboUbicacionMarcadores> | null;
  editable?: boolean;
  onMarcadoresChange?: (next: NuboUbicacionMarcadores) => void;
};

function pct(value: number): string {
  return `${value}%`;
}

export function NuboUbicacionSitioFigure({
  src,
  alt = "Ubicación del proyecto NUBO",
  marcadores: marcadoresInput,
  editable = false,
  onMarcadoresChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<NuboUbicacionMarkerId | null>(null);
  const marcadores = normalizeNuboUbicacionMarcadores(marcadoresInput);

  const updateMarker = useCallback(
    (id: NuboUbicacionMarkerId, patch: Partial<NuboUbicacionMarcador>) => {
      if (!onMarcadoresChange) return;
      onMarcadoresChange({
        ...marcadores,
        [id]: { ...marcadores[id], ...patch },
      });
    },
    [marcadores, onMarcadoresChange],
  );

  const positionFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      left: Math.min(96, Math.max(4, ((clientX - rect.left) / rect.width) * 100)),
      top: Math.min(96, Math.max(4, ((clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const handlePointerDown = (id: NuboUbicacionMarkerId) => (e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    dragIdRef.current = id;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const id = dragIdRef.current;
    if (!editable || !id) return;
    const pos = positionFromPointer(e.clientX, e.clientY);
    if (!pos) return;
    updateMarker(id, pos);
  };

  const handlePointerUp = () => {
    dragIdRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto w-full max-w-5xl overflow-hidden rounded-sm border bg-slate-900 ${
        editable ? "border-[#2DD4BF] ring-2 ring-[#2DD4BF]/20" : "border-slate-200"
      }`}
      style={{ aspectRatio: NUBO_UBICACION_MAP_ASPECT }}
      onPointerMove={editable ? handlePointerMove : undefined}
      onPointerUp={editable ? handlePointerUp : undefined}
      onPointerCancel={editable ? handlePointerUp : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill
        loading="eager"
        className="pointer-events-none object-cover select-none"
        unoptimized
        draggable={false}
        onLoad={() => requestAnimationFrame(refitAllPropuestaSlides)}
      />

      {NUBO_UBICACION_MARKER_CONFIG.map((config) => {
        const Icon = config.icon;
        const pos = marcadores[config.id];
        return (
          <div
            key={config.id}
            role={editable ? "button" : undefined}
            tabIndex={editable ? 0 : undefined}
            aria-label={editable ? `Mover ${config.label}` : config.label}
            className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 touch-none ${
              editable ? "cursor-grab active:cursor-grabbing" : ""
            }`}
            style={{ top: pct(pos.top), left: pct(pos.left) }}
            onPointerDown={handlePointerDown(config.id)}
          >
            <div
              className={`flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 shadow-md shadow-slate-950/25 ring-1 backdrop-blur-[2px] sm:pr-2.5 ${
                editable ? "bg-white ring-2 ring-[#2DD4BF]/40" : "bg-white/94"
              } ${config.ring}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${config.iconBg}`}
              >
                <Icon className={`h-3 w-3 ${config.iconColor}`} strokeWidth={2.5} />
              </span>
              <span className="whitespace-nowrap text-[10px] font-semibold leading-none text-slate-900">
                {config.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { DEFAULT_NUBO_UBICACION_MARCADORES };
