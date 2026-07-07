import { PASAJE_ALAMOS_ID } from "@/lib/catalog/desarrollos-registry";
import { MISION_LA_GAVIA_DESARROLLO_ID } from "@/lib/catalog/mision-la-gavia";

export const GUARDIA_RADIO_METROS_DEFAULT = 100;

export type GuardiaCasetaPunto = {
  lat: number;
  lng: number;
  radioMetros: number;
  etiqueta: string | null;
};

export type GuardiaCasetaConfig = {
  desarrolloId: string;
  lat: number;
  lng: number;
  radioMetros: number;
  etiqueta: string | null;
  /** Puntos adicionales válidos para marcaje (p. ej. oficina + obra). */
  puntosExtra?: GuardiaCasetaPunto[];
};

const PASAJE_OFICINA_BBR: GuardiaCasetaPunto = {
  lat: 20.5936759,
  lng: -100.3762195,
  radioMetros: GUARDIA_RADIO_METROS_DEFAULT,
  etiqueta: "Oficina comercial · BBR Habitarea (Pasaje Álamos)",
};

const PASAJE_OBRA_INDUSTRIALIZACION: GuardiaCasetaPunto = {
  lat: 20.6046377,
  lng: -100.3799446,
  radioMetros: GUARDIA_RADIO_METROS_DEFAULT,
  etiqueta: "Obra · Av. Industrialización #09, Álamos 2ª Secc.",
};

/** Fallback si aún no hay fila en Supabase. */
export const GUARDIA_CASETA_FALLBACK: Record<string, GuardiaCasetaConfig> = {
  [PASAJE_ALAMOS_ID]: {
    desarrolloId: PASAJE_ALAMOS_ID,
    ...PASAJE_OFICINA_BBR,
    puntosExtra: [PASAJE_OBRA_INDUSTRIALIZACION],
  },
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

export const getCasetaMarcajePuntos = (config: GuardiaCasetaConfig): GuardiaCasetaPunto[] => {
  const primary: GuardiaCasetaPunto = {
    lat: config.lat,
    lng: config.lng,
    radioMetros: config.radioMetros,
    etiqueta: config.etiqueta,
  };

  const extras = config.puntosExtra ?? [];
  const seen = new Set<string>();
  const puntos: GuardiaCasetaPunto[] = [];

  for (const punto of [primary, ...extras]) {
    const key = `${punto.lat.toFixed(6)},${punto.lng.toFixed(6)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    puntos.push(punto);
  }

  return puntos;
};

export const formatCasetaEtiquetaResumen = (config: GuardiaCasetaConfig): string | null => {
  const labels = getCasetaMarcajePuntos(config)
    .map((punto) => punto.etiqueta?.trim())
    .filter(Boolean) as string[];

  if (!labels.length) {
    return null;
  }

  return labels.length === 1 ? labels[0] : labels.join(" · ");
};

export type GuardiaMarcajeCasetaEval = {
  distanciaMetros: number;
  dentroRadio: boolean;
  radioMetros: number;
  etiqueta: string | null;
};

/** Valida GPS contra el punto principal o cualquier punto extra (el más cercano). */
export const evaluarMarcajeCaseta = (
  lat: number,
  lng: number,
  config: GuardiaCasetaConfig,
): GuardiaMarcajeCasetaEval => {
  const puntos = getCasetaMarcajePuntos(config);
  let mejor: GuardiaMarcajeCasetaEval = {
    distanciaMetros: Number.POSITIVE_INFINITY,
    dentroRadio: false,
    radioMetros: puntos[0]?.radioMetros ?? GUARDIA_RADIO_METROS_DEFAULT,
    etiqueta: puntos[0]?.etiqueta ?? null,
  };

  for (const punto of puntos) {
    const distanciaMetros = haversineMetros(lat, lng, punto.lat, punto.lng);
    const dentroRadio = distanciaMetros <= punto.radioMetros;

    if (dentroRadio) {
      return {
        distanciaMetros,
        dentroRadio: true,
        radioMetros: punto.radioMetros,
        etiqueta: punto.etiqueta,
      };
    }

    if (distanciaMetros < mejor.distanciaMetros) {
      mejor = {
        distanciaMetros,
        dentroRadio: false,
        radioMetros: punto.radioMetros,
        etiqueta: punto.etiqueta,
      };
    }
  }

  return mejor;
};
