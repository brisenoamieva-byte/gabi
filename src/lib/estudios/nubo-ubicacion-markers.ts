import type { LucideIcon } from "lucide-react";
import { BedDouble, Signpost, TreePine } from "lucide-react";

export type NuboUbicacionMarkerId = "acceso" | "hotel" | "arbolada";

export type NuboUbicacionMarcador = {
  top: number;
  left: number;
};

export type NuboUbicacionMarcadores = Record<NuboUbicacionMarkerId, NuboUbicacionMarcador>;

export type NuboUbicacionMarkerConfig = {
  id: NuboUbicacionMarkerId;
  label: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  ring: string;
};

export const NUBO_UBICACION_MAP_ASPECT = 1024 / 640;

export const NUBO_UBICACION_MARKER_CONFIG: NuboUbicacionMarkerConfig[] = [
  {
    id: "acceso",
    label: "Acceso",
    icon: Signpost,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-900",
    ring: "ring-amber-200/70",
  },
  {
    id: "hotel",
    label: "Hotel",
    icon: BedDouble,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-900",
    ring: "ring-sky-200/70",
  },
  {
    id: "arbolada",
    label: "Zona arbolada",
    icon: TreePine,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-800",
    ring: "ring-emerald-200/70",
  },
];

/** Posiciones por defecto (% del mapa). */
export const DEFAULT_NUBO_UBICACION_MARCADORES: NuboUbicacionMarcadores = {
  acceso: { top: 47, left: 76 },
  hotel: { top: 58, left: 40 },
  arbolada: { top: 45, left: 38 },
};

function clampPct(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(96, Math.max(4, Math.round(n * 10) / 10));
}

export function normalizeNuboUbicacionMarcadores(
  raw?: Partial<Record<NuboUbicacionMarkerId, Partial<NuboUbicacionMarcador>>> | null,
): NuboUbicacionMarcadores {
  const base = DEFAULT_NUBO_UBICACION_MARCADORES;
  return {
    acceso: {
      top: clampPct(raw?.acceso?.top, base.acceso.top),
      left: clampPct(raw?.acceso?.left, base.acceso.left),
    },
    hotel: {
      top: clampPct(raw?.hotel?.top, base.hotel.top),
      left: clampPct(raw?.hotel?.left, base.hotel.left),
    },
    arbolada: {
      top: clampPct(raw?.arbolada?.top, base.arbolada.top),
      left: clampPct(raw?.arbolada?.left, base.arbolada.left),
    },
  };
}
