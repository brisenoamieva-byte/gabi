import { MISION_LA_GAVIA_DESARROLLO_ID } from "@/lib/catalog/mision-la-gavia";

export const GUARDIA_RADIO_METROS_DEFAULT = 100;

export type GuardiaCasetaConfig = {
  desarrolloId: string;
  lat: number;
  lng: number;
  radioMetros: number;
  etiqueta: string | null;
};

/** Fallback si aún no hay fila en Supabase (piloto La Gavia). */
export const GUARDIA_CASETA_FALLBACK: Record<string, GuardiaCasetaConfig> = {
  [MISION_LA_GAVIA_DESARROLLO_ID]: {
    desarrolloId: MISION_LA_GAVIA_DESARROLLO_ID,
    lat: 20.5547,
    lng: -100.4359,
    radioMetros: GUARDIA_RADIO_METROS_DEFAULT,
    etiqueta: "Caseta ventas · Plaza Citadina (Paseo Constituyentes, El Pueblito)",
  },
};

export function haversineMetros(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadiusM = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(a));
}

export function isValidGeoCoordinate(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
