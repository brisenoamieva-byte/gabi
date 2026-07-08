import { isDesarrolloAutomationActive } from "@/lib/comercial/desarrollo-automation";
import { getEmailConfig, isEmailConfigured } from "@/lib/email/config";
import { buildPostVisitaEmailContent } from "@/lib/email/post-visita-template";
import { getDesarrolloById } from "@/lib/catalog/service";
import type { VisitaFollowUpInput } from "@/lib/visitas/follow-up";
import type { VisitaInput } from "@/lib/visitas/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SendPostVisitaEmailResult =
  | { sent: true; id?: string }
  | { sent: false; reason: "not_configured" | "no_email" | "invalid_email" | "send_failed"; detail?: string };

const sendViaResend = async (params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id?: string }> => {
  const { apiKey, from } = getEmailConfig();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY no configurada.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  const data = (await response.json()) as { id?: string; message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? `Resend respondió ${response.status}`);
  }

  return { id: data.id };
};

export const sendPostVisitaFollowUpEmail = async (
  input: VisitaFollowUpInput & { clienteEmail: string },
): Promise<SendPostVisitaEmailResult> => {
  if (!isEmailConfigured()) {
    return { sent: false, reason: "not_configured" };
  }

  const email = input.clienteEmail.trim().toLowerCase();
  if (!email) {
    return { sent: false, reason: "no_email" };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { sent: false, reason: "invalid_email" };
  }

  const { siteUrl } = getEmailConfig();
  const content = buildPostVisitaEmailContent(input, siteUrl);

  try {
    const result = await sendViaResend({
      to: email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    return { sent: true, id: result.id };
  } catch (error) {
    return {
      sent: false,
      reason: "send_failed",
      detail: error instanceof Error ? error.message : "Error al enviar",
    };
  }
};

export const sendPostVisitaEmailFromVisita = async (
  input: VisitaInput,
): Promise<SendPostVisitaEmailResult> => {
  if (input.tipo !== "recorrido_completado") {
    return { sent: false, reason: "no_email" };
  }

  if (!(await isDesarrolloAutomationActive(input.desarrolloId))) {
    return { sent: false, reason: "no_email", detail: "Desarrollo pausado." };
  }

  const email = input.clienteEmail?.trim();
  if (!email) {
    return { sent: false, reason: "no_email" };
  }

  const desarrollo = await getDesarrolloById(input.desarrolloId);
  const desarrolloNombre = desarrollo?.nombre ?? "Desarrollo";

  return sendPostVisitaFollowUpEmail({
    desarrolloNombre,
    asesorNombre: input.asesorNombre ?? "Tu asesor",
    clienteNombre: input.clienteNombre ?? "",
    clienteEmail: email,
    clusterNombre: input.clusterNombre,
    prototipoNombre: input.prototipoNombre,
    precioFinal: input.precioFinal,
  });
};
