import { getEmailConfig } from "@/lib/email/config";
import type { CadenciaReminderTarget } from "@/lib/comercial/cadencia-service";
import { isWhatsAppCloudConfigured } from "@/lib/whatsapp/config";
import { sendAsesorComplianceNudge } from "@/lib/whatsapp/meta-cloud-api";

const sendEmailReminder = async (
  email: string,
  subject: string,
  text: string,
): Promise<{ sent: boolean; error?: string }> => {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey) {
    return { sent: false, error: "email_not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: email, subject, text }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return { sent: false, error: detail };
    }

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "send_failed",
    };
  }
};

export const sendCadenciaReminderToAsesor = async (
  target: CadenciaReminderTarget,
): Promise<{ sent: boolean; channel?: string; error?: string }> => {
  const { siteUrl } = getEmailConfig();
  const dashboardUrl = `${siteUrl.replace(/\/$/, "")}/dashboard`;

  const body = [
    `Hola ${target.asesorNombre},`,
    "",
    `Tienes ${target.touchCount} contacto(s) de perfilamiento para hoy en ${target.desarrolloNombre}.`,
    "",
    `Prioridad: ${target.priorityLabel}`,
    "",
    "Abre tu bandeja en GABI para enviar WhatsApp o registrar la llamada:",
    dashboardUrl,
    "",
    "Meta: agendar visita al desarrollo.",
  ].join("\n");

  if (target.asesorTelefono && isWhatsAppCloudConfigured(target.desarrolloId)) {
    const result = await sendAsesorComplianceNudge(
      target.desarrolloId,
      target.asesorTelefono,
      target.asesorNombre,
      target.touchCount,
      target.desarrolloNombre,
      target.priorityLabel,
    );

    if (result.sent) {
      return { sent: true, channel: "whatsapp" };
    }
  }

  if (target.asesorEmail) {
    const emailResult = await sendEmailReminder(
      target.asesorEmail,
      `Hoy toca · ${target.desarrolloNombre} (${target.touchCount})`,
      body,
    );

    if (emailResult.sent) {
      return { sent: true, channel: "email" };
    }

    return { sent: false, error: emailResult.error };
  }

  return { sent: false, error: "no_contact_channel" };
};
