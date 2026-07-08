import { getGerenteEmailsForDesarrollo } from "@/lib/comercial/gerente-email-recipients";
import { isEmailConfigured } from "@/lib/email/config";
import { sendViaResend } from "@/lib/email/send-via-resend";

const getSiteUrl = () => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
};

export type SolicitudApartadoEmailResult =
  | { sent: true; recipients: string[] }
  | { sent: false; error: "email_not_configured" | "no_gerente_email" | "send_failed"; detail?: string };

export const sendSolicitudApartadoEmail = async (input: {
  desarrolloId: string;
  desarrolloNombre: string;
  prospectoId: string;
  prospectoNombre: string;
  asesorNombre: string;
  notas?: string;
  unidadNumero?: string | null;
}): Promise<SolicitudApartadoEmailResult> => {
  if (!isEmailConfigured()) {
    return { sent: false, error: "email_not_configured" };
  }

  const recipients = await getGerenteEmailsForDesarrollo(input.desarrolloId);
  if (!recipients.length) {
    return { sent: false, error: "no_gerente_email" };
  }

  const link = `${getSiteUrl()}/admin/leads?desarrolloId=${encodeURIComponent(input.desarrolloId)}&prospecto=${encodeURIComponent(input.prospectoId)}`;
  const subject = `[GABI] Solicitud de apartado — ${input.prospectoNombre}`;
  const unidadLine = input.unidadNumero ? `Unidad sugerida: ${input.unidadNumero}` : "";
  const notasLine = input.notas?.trim() ? `Notas del asesor: ${input.notas.trim()}` : "";

  const text = [
    `El asesor ${input.asesorNombre} solicita registrar un apartado.`,
    `Prospecto: ${input.prospectoNombre}`,
    `Desarrollo: ${input.desarrolloNombre}`,
    unidadLine,
    notasLine,
    "",
    "Regístralo en Admin → Leads:",
    link,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>El asesor <strong>${input.asesorNombre}</strong> solicita registrar un apartado.</p>
    <ul>
      <li><strong>Prospecto:</strong> ${input.prospectoNombre}</li>
      <li><strong>Desarrollo:</strong> ${input.desarrolloNombre}</li>
      ${input.unidadNumero ? `<li><strong>Unidad sugerida:</strong> ${input.unidadNumero}</li>` : ""}
      ${input.notas?.trim() ? `<li><strong>Notas:</strong> ${input.notas.trim()}</li>` : ""}
    </ul>
    <p><a href="${link}">Abrir en GABI Admin y registrar apartado</a></p>
  `;

  try {
    for (const to of recipients) {
      await sendViaResend({ to, subject, html, text });
    }
    return { sent: true, recipients };
  } catch (error) {
    return {
      sent: false,
      error: "send_failed",
      detail: error instanceof Error ? error.message : "Error al enviar correo.",
    };
  }
};

export function formatSolicitudApartadoEmailHint(result: SolicitudApartadoEmailResult): string {
  if (result.sent) {
    return `Gerencia notificada por correo (${result.recipients.join(", ")}).`;
  }

  if (result.error === "email_not_configured") {
    return "Correo no configurado en el servidor — gerencia verá la solicitud en Admin → Leads.";
  }

  if (result.error === "no_gerente_email") {
    return "No hay correo de gerente configurado — la solicitud quedó en Admin → Leads.";
  }

  return result.detail
    ? `Solicitud registrada, pero falló el correo: ${result.detail}`
    : "Solicitud registrada, pero no se pudo enviar el correo.";
}
