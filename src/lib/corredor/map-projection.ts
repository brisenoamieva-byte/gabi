import { CORREDOR_MAP_BOUNDS } from "@/lib/corredor/coordinates";

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

/** Área visible aproximada del embed para alinear pines con logos. */
export function boundsForMapView(
  center: { lat: number; lng: number },
  zoom: number,
): MapBounds {
  const latDelta = 0.24 / 2 ** (zoom - 10);
  const lngDelta = 0.3 / 2 ** (zoom - 10);
  return {
    north: center.lat + latDelta * 0.52,
    south: center.lat - latDelta * 0.48,
    east: center.lng + lngDelta * 0.5,
    west: center.lng - lngDelta * 0.5,
  };
}

export function resolveMapOverlayBounds(
  center: { lat: number; lng: number },
  zoom: number,
  singleMarker: boolean,
): MapBounds {
  if (singleMarker) {
    return boundsForMapView(center, zoom);
  }
  if (zoom <= 11) {
    return CORREDOR_MAP_BOUNDS;
  }
  return boundsForMapView(center, zoom);
}

export function latLngToBoundsPercent(
  lat: number,
  lng: number,
  bounds: MapBounds,
): { left: number; top: number } {
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
  const left = ((lng - bounds.west) / lngSpan) * 100;
  const top = ((bounds.north - lat) / latSpan) * 100;
  return {
    left: Math.min(93, Math.max(7, left)),
    top: Math.min(88, Math.max(12, top)),
  };
}
