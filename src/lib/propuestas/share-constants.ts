export const SHARE_EXPIRY_PRESETS = [
  { id: "7", label: "7 días", days: 7 },
  { id: "14", label: "14 días", days: 14 },
  { id: "30", label: "30 días", days: 30 },
  { id: "90", label: "90 días", days: 90 },
  { id: "none", label: "Sin vencimiento", days: null },
] as const;

export type ShareExpiryPresetId = (typeof SHARE_EXPIRY_PRESETS)[number]["id"];

export const expiryFromPreset = (preset: ShareExpiryPresetId): string | null => {
  const item = SHARE_EXPIRY_PRESETS.find((p) => p.id === preset);
  if (!item?.days) return null;
  const date = new Date();
  date.setDate(date.getDate() + item.days);
  return date.toISOString();
};
