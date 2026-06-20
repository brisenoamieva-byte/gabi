/** Normaliza teléfono mexicano para Meta WhatsApp Cloud API (solo dígitos, con 52). */
export const normalizePhoneForMetaWhatsApp = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  if (digits.length === 10) {
    return `52${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("52")) {
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
