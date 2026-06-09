export const getGoogleMapsApiKey = (): string =>
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

export const isGoogleMapsEnabled = (): boolean => getGoogleMapsApiKey().length > 0;

/** Referrers que deben estar en Google Cloud → Credentials → HTTP referrers. */
export const GOOGLE_MAPS_REFERRER_HINTS = [
  "http://localhost:3000/*",
  "https://www.gabi.mx/*",
  "https://gabi.mx/*",
  "https://*.vercel.app/*",
] as const;

export function getGoogleMapsSetupHint(): string {
  if (typeof window === "undefined") {
    return "Revisa NEXT_PUBLIC_GOOGLE_MAPS_API_KEY y restricciones de dominio en Google Cloud.";
  }

  const host = window.location.hostname;
  return `En Google Cloud, agrega https://${host}/* a los referrers permitidos de la API key y activa Maps JavaScript API.`;
}
