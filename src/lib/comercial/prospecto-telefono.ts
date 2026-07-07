/** Normaliza a 10 dígitos locales (México). Acepta +52, espacios y guiones. */
export const normalizeProspectoTelefono = (value?: string | null): string | null => {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) {
    return null;
  }

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith("52")) {
    return digits.slice(2);
  }

  if (digits.length > 10) {
    return digits.slice(-10);
  }

  return digits;
};

export type ProspectoTelefonoValidation =
  | { ok: true; telefono: string }
  | { ok: false; error: string };

export const validateProspectoTelefono = (value?: string | null): ProspectoTelefonoValidation => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return { ok: false, error: "El teléfono es obligatorio (10 dígitos)." };
  }

  const telefono = normalizeProspectoTelefono(trimmed);
  if (!telefono || telefono.length !== 10) {
    return { ok: false, error: "El teléfono debe tener exactamente 10 dígitos." };
  }

  return { ok: true, telefono };
};

export const formatProspectoTelefonoDisplay = (telefono: string) => {
  if (telefono.length !== 10) {
    return telefono;
  }
  return `${telefono.slice(0, 2)} ${telefono.slice(2, 6)} ${telefono.slice(6)}`;
};

export const buildProspectoTelefonoDuplicadoMessage = (input: {
  prospectoNombre: string;
  asesorNombre: string | null;
  mismoAsesor?: boolean;
}) => {
  if (input.mismoAsesor) {
    return `Este teléfono ya está en tu bandeja: ${input.prospectoNombre}.`;
  }

  const asesorLabel = input.asesorNombre?.trim() || "sin asesor asignado";
  return `Este prospecto ya está registrado con ese teléfono. Lo tiene asignado el asesor ${asesorLabel}.`;
};
