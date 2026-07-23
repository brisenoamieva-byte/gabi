/** Normaliza teléfono para Meta WhatsApp Cloud API (solo dígitos).
 * México móvil: WhatsApp espera 521 + 10 dígitos (no 52 + 10).
 */
export const normalizePhoneForMetaWhatsApp = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  // 10 dígitos locales MX → 521XXXXXXXXXX
  if (digits.length === 10) {
    return `521${digits}`;
  }

  // 52 + 10 dígitos → insertar el 1 de móvil
  if (digits.length === 12 && digits.startsWith("52") && !digits.startsWith("521")) {
    return `521${digits.slice(2)}`;
  }

  // Ya viene como 521 + 10
  if (digits.length === 13 && digits.startsWith("521")) {
    return digits;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
};

export const formatPhoneDisplay = (phone: string | null | undefined): string => {
  if (!phone?.trim()) {
    return "Sin teléfono";
  }
  return phone.trim();
};
