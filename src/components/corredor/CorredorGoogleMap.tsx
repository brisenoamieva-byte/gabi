"use client";

import { useMemo } from "react";
import {
  CORREDOR_MAP_CENTER,
  getDesarrolloUbicacion,
} from "@/lib/corredor/coordinates";
import type { CorredorDesarrollo } from "@/lib/corredor/types";
import { CorredorMapPinnedView } from "@/components/corredor/CorredorMapPinnedView";

type CorredorGoogleMapProps = {
  desarrollos: CorredorDesarrollo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Un solo pin (ficha de desarrollo). */
  singleDesarrolloId?: string;
  className?: string;
};

/**
 * Mapa del corredor sur con logos en cada desarrollo.
 * Usa embed + pines HTML (no depende de Maps JavaScript API ni referrers en producción).
 */
export function CorredorGoogleMap({
  desarrollos,
  selectedId,
  onSelect,
  singleDesarrolloId,
  className = "",
}: CorredorGoogleMapProps) {
  const markers = useMemo(() => {
    const list = singleDesarrolloId
      ? desarrollos.filter((d) => d.id === singleDesarrolloId)
      : desarrollos;
    return list.map((d) => ({
      desarrollo: d,
      ...getDesarrolloUbicacion(d),
    }));
  }, [desarrollos, singleDesarrolloId]);

  const mapCenter = useMemo(() => {
    if (singleDesarrolloId && markers[0]) {
      return { lat: markers[0].lat, lng: markers[0].lng };
    }
    if (selectedId) {
      const selected = markers.find((m) => m.desarrollo.id === selectedId);
      if (selected) return { lat: selected.lat, lng: selected.lng };
    }
    return CORREDOR_MAP_CENTER;
  }, [markers, selectedId, singleDesarrolloId]);

  const defaultZoom = singleDesarrolloId ? 14 : selectedId ? 13 : 11;

  return (
    <CorredorMapPinnedView
      className={className}
      center={mapCenter}
      zoom={defaultZoom}
      markers={markers}
      selectedId={selectedId}
      onSelect={onSelect}
      singleDesarrolloId={singleDesarrolloId}
    />
  );
}
