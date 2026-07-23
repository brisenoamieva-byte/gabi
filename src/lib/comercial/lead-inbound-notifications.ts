import { getAsesorById } from "@/lib/admin/asesores-service";
import { getEmailConfig } from "@/lib/email/config";
import { desarrollos } from "@/lib/data";
import { assignAsesorByGuardiaCarousel } from "@/lib/comercial/lead-guardia-assignment";
import type { ProspectoRecord } from "@/lib/comercial/sembrado-status";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isWhatsAppCloudConfigured } from "@/lib/whatsapp/config";
import {
  sendAsesorLeadAlert,
  sendProspectLeadConfirmation,
} from "@/lib/whatsapp/meta-cloud-api";
import {
  buildAsesorFallbackMessage,
  buildProspectFallbackMessage,
} from "@/lib/whatsapp/templates";
import { buildWhatsAppUrl } from "@/lib/visitas/follow-up";
import { isDesarrolloAutomationActive } from "@/lib/comercial/desarrollo-automation";
import { bootstrapCadenciaForProspecto } from "@/lib/comercial/cadencia-service";
import {
  buildNewLeadPushPayload,
  isWebPushConfigured,
  sendPushToAsesor,
} from "@/lib/push/web-push";

export type LeadContactEventInput = {
  prospectoId: string;
  desarrolloId: string;
  canal: string;
  destinatarioTipo: "prospecto" | "asesor";
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string;
  errorMessage?: string;
  payload?: Record<string, unknown>;
};

const logContactEvent = async (input: LeadContactEventInput) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  await supabase.from("lead_contact_events").insert({
    prospecto_id: input.prospectoId,
    desarrollo_id: input.desarrolloId,
    canal: input.canal,
    destinatario_tipo: input.destinatarioTipo,
    status: input.status,
    provider_message_id: input.providerMessageId ?? null,
    error_message: input.errorMessage ?? null,
    payload: input.payload ?? null,
  });
};

const getDesarrolloNombre = (desarrolloId: string): string => {
  const match = desarrollos.find((item) => item.id === desarrolloId);
  return match?.nombre ?? desarrolloId;
};

const fetchProspectoBundle = async (prospectoId: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("prospectos")
    .select("*, campana:campanas(nombre)")
    .eq("id", prospectoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProspectoRecord & { campana?: { nombre?: string } | null };
};

const sendAsesorEmailFallback = async (
  email: string,
  subject: string,
  text: string,
): Promise<{ sent: boolean; error?: string }> => {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey) {
    return { sent: false, error: "email_not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const data = (await response.json()) as { message?: string };
    return { sent: false, error: data.message ?? response.statusText };
  }

  return { sent: true };
};

/**
 * Resuelve asesor: hint del formulario → carrusel guardia del día.
 */
export const resolveLeadAsesorId = async (
  desarrolloId: string,
  hintedAsesorId?: string | null,
): Promise<string | null> => {
  if (hintedAsesorId) {
    const asesor = await getAsesorById(hintedAsesorId);
    if (asesor?.activo && asesor.desarrollosIds.includes(desarrolloId)) {
      return hintedAsesorId;
    }
  }

  return assignAsesorByGuardiaCarousel(desarrolloId);
};

/**
 * WhatsApp automático al prospecto y al asesor en guardia (carrusel).
 * Registra eventos en lead_contact_events.
 */
export const dispatchLeadInboundNotifications = async (
  prospectoId: string,
): Promise<void> => {
  const prospecto = await fetchProspectoBundle(prospectoId);
  if (!prospecto) {
    return;
  }

  const desarrolloId = prospecto.desarrollo_id;

  if (!(await isDesarrolloAutomationActive(desarrolloId))) {
    await logContactEvent({
      prospectoId,
      desarrolloId,
      canal: "email_asesor",
      destinatarioTipo: "asesor",
      status: "skipped",
      errorMessage: "Desarrollo pausado — sin notificaciones automáticas.",
    });
    return;
  }

  const desarrolloNombre = getDesarrolloNombre(desarrolloId);
  const campanaNombre = prospecto.campana?.nombre ?? "Directo";

  if (!prospecto.asesor_id) {
    await logContactEvent({
      prospectoId,
      desarrolloId,
      canal: "whatsapp_asesor",
      destinatarioTipo: "asesor",
      status: "skipped",
      errorMessage: "Sin asesor asignado (sin guardia publicada hoy).",
    });
    return;
  }

  const asesor = await getAsesorById(prospecto.asesor_id);
  if (!asesor) {
    await logContactEvent({
      prospectoId,
      desarrolloId,
      canal: "whatsapp_asesor",
      destinatarioTipo: "asesor",
      status: "skipped",
      errorMessage: "Asesor no encontrado.",
    });
    return;
  }

  const siteUrl = getEmailConfig().siteUrl.replace(/\/$/, "");
  const adminLeadsUrl = `${siteUrl}/admin/leads?desarrolloId=${encodeURIComponent(desarrolloId)}`;

  const whatsappReady = isWhatsAppCloudConfigured(desarrolloId);

  if (prospecto.telefono?.trim() && whatsappReady) {
    const prospectResult = await sendProspectLeadConfirmation(
      desarrolloId,
      prospecto.telefono,
      prospecto.nombre,
      desarrolloNombre,
      asesor.nombre,
    );

    await logContactEvent({
      prospectoId,
      desarrolloId,
      canal: "whatsapp_prospect",
      destinatarioTipo: "prospecto",
      status: prospectResult.sent ? "sent" : prospectResult.skippedReason ? "skipped" : "failed",
      providerMessageId: prospectResult.messageId,
      errorMessage: prospectResult.error ?? prospectResult.skippedReason,
      payload: { telefono: prospecto.telefono },
    });
  } else {
    await logContactEvent({
      prospectoId,
      desarrolloId,
      canal: "whatsapp_prospect",
      destinatarioTipo: "prospecto",
      status: "skipped",
      errorMessage: prospecto.telefono
        ? "WhatsApp Cloud no configurado para este desarrollo."
        : "Prospecto sin teléfono.",
    });
  }

  const asesorPhone = asesor.telefono;
  const prospectWaUrl =
    prospecto.telefono && buildWhatsAppUrl(
      prospecto.telefono,
      buildProspectFallbackMessage(prospecto.nombre, desarrolloNombre, asesor.nombre),
    );

  if (asesorPhone?.trim() && whatsappReady) {
    const asesorResult = await sendAsesorLeadAlert(
      desarrolloId,
      asesorPhone,
      desarrolloNombre,
      prospecto.nombre,
      prospecto.telefono ?? "",
      campanaNombre,
    );

    await logContactEvent({
      prospectoId,
      desarrolloId,
      canal: "whatsapp_asesor",
      destinatarioTipo: "asesor",
      status: asesorResult.sent ? "sent" : asesorResult.skippedReason ? "skipped" : "failed",
      providerMessageId: asesorResult.messageId,
      errorMessage: asesorResult.error ?? asesorResult.skippedReason,
      payload: { telefono: asesorPhone, prospectWaUrl },
    });
  } else if (asesor.email) {
    const emailBody = buildAsesorFallbackMessage(
      desarrolloNombre,
      prospecto.nombre,
      prospecto.telefono ?? "Sin teléfono",
      campanaNombre,
      adminLeadsUrl,
    );

    const emailResult = await sendAsesorEmailFallback(
      asesor.email,
      `Nuevo lead · ${desarrolloNombre}`,
      emailBody + (prospectWaUrl ? `\n\nWhatsApp prospecto: ${prospectWaUrl}` : ""),
    );

    await logContactEvent({
      prospectoId,
      desarrolloId,
      canal: "email_asesor",
      destinatarioTipo: "asesor",
      status: emailResult.sent ? "sent" : "failed",
      errorMessage: emailResult.error,
      payload: { email: asesor.email, prospectWaUrl },
    });
  } else {
    await logContactEvent({
      prospectoId,
      desarrolloId,
      canal: "whatsapp_asesor",
      destinatarioTipo: "asesor",
      status: "skipped",
      errorMessage: "Asesor sin teléfono ni email.",
    });
  }

  if (isWebPushConfigured()) {
    const pushPayload = buildNewLeadPushPayload({
      desarrolloNombre,
      prospectoNombre: prospecto.nombre,
      prospectoId,
      telefono: prospecto.telefono,
      campanaNombre,
      siteUrl,
    });
    const pushResult = await sendPushToAsesor(asesor.id, pushPayload);
    await logContactEvent({
      prospectoId,
      desarrolloId,
      canal: "push_asesor",
      destinatarioTipo: "asesor",
      status:
        pushResult.sent > 0
          ? "sent"
          : pushResult.error === "no_subscriptions"
            ? "skipped"
            : "failed",
      errorMessage:
        pushResult.error ??
        (pushResult.failed > 0 ? `${pushResult.failed} endpoint(s) fallaron` : undefined),
      payload: { sent: pushResult.sent, failed: pushResult.failed },
    });
  } else {
    await logContactEvent({
      prospectoId,
      desarrolloId,
      canal: "push_asesor",
      destinatarioTipo: "asesor",
      status: "skipped",
      errorMessage: "Web Push no configurado.",
    });
  }

  try {
    await bootstrapCadenciaForProspecto(prospectoId);
  } catch (cadenciaError) {
    console.error("[dispatchLeadInboundNotifications] cadencia bootstrap failed", cadenciaError);
  }
};
