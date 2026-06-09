import type { CorredorDesarrollo } from "./types";

/** Centro del corredor sur (vista inicial del mapa). */
export const CORREDOR_MAP_CENTER = { lat: 20.505, lng: -100.448 };

export const CORREDOR_MAP_BOUNDS = {
  north: 20.56,
  south: 20.43,
  east: -100.38,
  west: -100.5,
};

/** Interpola coordenadas aproximadas a lo largo del Blvd. Metropolitano (pendiente pin exacto). */
export function coordsAproximadasPorKm(km: number, offsetLng = 0): { lat: number; lng: number } {
  const originLat = 20.5485;
  const originLng = -100.428;
  const latPerKm = -0.00385;
  const lngPerKm = -0.00215;
  return {
    lat: originLat + km * latPerKm,
    lng: originLng + km * lngPerKm + offsetLng,
  };
}

const UBICACIONES_APROX: Record<
  string,
  { lat: number; lng: number } | ((d: CorredorDesarrollo) => { lat: number; lng: number })
> = {
  "el-condado": () => ({ lat: 20.5080528, lng: -100.4041649 }),
  velasur: () => ({ lat: 20.5092836, lng: -100.4081006 }),
  "real-del-bosque": () => ({ lat: 20.508011, lng: -100.3999774 }),
  simate: () => ({ lat: 20.5044375, lng: -100.3810625 }),
  "canadas-del-arroyo": () => ({ lat: 20.4937675, lng: -100.3808319 }),
  "canadas-del-valle": () => ({ lat: 20.4773005, lng: -100.3755297 }),
  "preserve-country": () => ({ lat: 20.4828037, lng: -100.3768851 }),
  "preserve-sur": () => ({ lat: 20.4918345, lng: -100.3779325 }),
  "faro-de-los-cisnes": () => ({ lat: 20.4490592, lng: -100.4297274 }),
  "ciudad-maderas-corregidora": () => ({ lat: 20.4413669, lng: -100.4365753 }),
  "arroyo-del-pedregal": () => ({ lat: 20.5033002, lng: -100.3830604 }),
  "valle-cardinal": () => ({ lat: 20.423159, lng: -100.2983034 }),
};

export function getDesarrolloUbicacion(d: CorredorDesarrollo): {
  lat: number;
  lng: number;
  aproximada: boolean;
} {
  if (d.ubicacion) {
    return {
      lat: d.ubicacion.lat,
      lng: d.ubicacion.lng,
      aproximada: d.ubicacion.aproximada ?? false,
    };
  }

  const resolver = UBICACIONES_APROX[d.id];
  const coords =
    typeof resolver === "function"
      ? resolver(d)
      : d.kmCorredor != null
        ? coordsAproximadasPorKm(d.kmCorredor)
        : CORREDOR_MAP_CENTER;

  return { ...coords, aproximada: true };
}

export function getCorredorMapsUrl(d: CorredorDesarrollo): string {
  if (d.ubicacion?.mapsUrl) return d.ubicacion.mapsUrl;
  const { lat, lng } = getDesarrolloUbicacion(d);
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
