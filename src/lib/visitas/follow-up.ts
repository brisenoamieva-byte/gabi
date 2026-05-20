import { formatPrice } from "@/lib/data";

export type VisitaFollowUpInput = {
  desarrolloNombre: string;
  asesorNombre: string;
  clienteNombre: string;
  clusterNombre?: string;
  prototipoNombre?: string;
  precioFinal?: number;
};

export const buildVisitaFollowUpSummary = (input: VisitaFollowUpInput) => {
  const lines = [
    `¡Hola${input.clienteNombre ? ` ${input.clienteNombre.split(" ")[0]}` : ""}!`,
    "",
    `Gracias por tu visita a *${input.desarrolloNombre}*.`,
    input.clusterNombre ? `Interés: ${input.clusterNombre}` : null,
    input.prototipoNombre ? `Producto: ${input.prototipoNombre}` : null,
    input.precioFinal ? `Precio referencia: ${formatPrice(input.precioFinal)}` : null,
    "",
    "Quedo atento para resolver dudas y dar seguimiento a tu proceso.",
    "",
    `— ${input.asesorNombre}`,
    "Enviado con gabi",
  ].filter(Boolean);

  return lines.join("\n");
};

export const normalizePhoneForWhatsApp = (phone: string) =>
  phone.replace(/\D/g, "");

export const buildWhatsAppUrl = (phone: string, message: string) => {
  const digits = normalizePhoneForWhatsApp(phone);
  if (!digits) {
    return null;
  }

  const withCountry =
    digits.length === 10 ? `52${digits}` : digits.startsWith("52") ? digits : `52${digits}`;

  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
};
