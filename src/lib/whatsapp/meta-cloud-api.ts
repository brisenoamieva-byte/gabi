import {
  getMetaGraphApiVersion,
  getWhatsAppCloudConfig,
  type WhatsAppCloudConfig,
} from "@/lib/whatsapp/config";
import { normalizePhoneForMetaWhatsApp } from "@/lib/whatsapp/phone";
import {
  WHATSAPP_TEMPLATE_ASESOR,
  WHATSAPP_TEMPLATE_LANGUAGE,
  WHATSAPP_TEMPLATE_PROSPECT,
} from "@/lib/whatsapp/templates";

export type SendWhatsAppTemplateResult = {
  sent: boolean;
  messageId?: string;
  error?: string;
  skippedReason?: string;
};

const textParameter = (text: string) => ({
  type: "text" as const,
  text: text.slice(0, 1024),
});

const sendTemplateMessage = async (
  config: WhatsAppCloudConfig,
  toPhone: string,
  templateName: string,
  bodyParameters: string[],
): Promise<SendWhatsAppTemplateResult> => {
  if (!config.enabled) {
    return { sent: false, skippedReason: "whatsapp_disabled" };
  }

  if (!config.accessToken || !config.phoneNumberId) {
    return { sent: false, skippedReason: "not_configured" };
  }

  const to = normalizePhoneForMetaWhatsApp(toPhone);
  if (!to) {
    return { sent: false, skippedReason: "invalid_phone" };
  }

  const version = getMetaGraphApiVersion();
  const url = `https://graph.facebook.com/${version}/${config.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: WHATSAPP_TEMPLATE_LANGUAGE },
        components: [
          {
            type: "body",
            parameters: bodyParameters.map((value) => textParameter(value)),
          },
        ],
      },
    }),
  });

  const data = (await response.json()) as {
    messages?: Array<{ id: string }>;
    error?: { message?: string; error_user_msg?: string };
  };

  if (!response.ok) {
    const detail = data.error?.error_user_msg ?? data.error?.message ?? response.statusText;
    return { sent: false, error: detail };
  }

  return { sent: true, messageId: data.messages?.[0]?.id };
};

export const sendProspectLeadConfirmation = async (
  desarrolloId: string,
  toPhone: string,
  prospectNombre: string,
  desarrolloNombre: string,
  asesorNombre: string,
): Promise<SendWhatsAppTemplateResult> => {
  const config = getWhatsAppCloudConfig(desarrolloId);
  const firstName = prospectNombre.split(/\s+/)[0] || prospectNombre;

  return sendTemplateMessage(config, toPhone, WHATSAPP_TEMPLATE_PROSPECT, [
    firstName,
    desarrolloNombre,
    asesorNombre,
  ]);
};

export const sendAsesorLeadAlert = async (
  desarrolloId: string,
  toPhone: string,
  desarrolloNombre: string,
  prospectNombre: string,
  prospectTelefono: string,
  campanaNombre: string,
): Promise<SendWhatsAppTemplateResult> => {
  const config = getWhatsAppCloudConfig(desarrolloId);

  return sendTemplateMessage(config, toPhone, WHATSAPP_TEMPLATE_ASESOR, [
    desarrolloNombre,
    prospectNombre,
    prospectTelefono || "Sin teléfono",
    campanaNombre || "Directo",
  ]);
};
