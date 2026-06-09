/**
 * Actualiza la ubicación exacta de un desarrollo del corredor.
 * Uso cuando el cliente comparte pin o link de Google Maps.
 *
 * Ejemplo en zona-sur-seed.ts:
 *   ubicacion: { lat: 20.4872, lng: -100.4678, aproximada: false },
 */
export type CorredorUbicacionInput = {
  lat: number;
  lng: number;
  aproximada?: boolean;
};

export function parseGoogleMapsUrl(url: string): CorredorUbicacionInput | null {
  const trimmed = url.trim();

  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return {
      lat: Number(atMatch[1]),
      lng: Number(atMatch[2]),
      aproximada: false,
    };
  }

  const qMatch = trimmed.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return {
      lat: Number(qMatch[1]),
      lng: Number(qMatch[2]),
      aproximada: false,
    };
  }

  return null;
}
