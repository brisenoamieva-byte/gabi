export const getGoogleMapsApiKey = (): string =>
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

export const isGoogleMapsEnabled = (): boolean => getGoogleMapsApiKey().length > 0;
