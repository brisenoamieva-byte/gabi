import webpush from "web-push";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
};

export type AsesorPushSubscription = {
  id: string;
  asesor_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
};

export type CompliancePushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  badgeCount?: number;
};

const getVapidConfig = (): {
  publicKey: string;
  privateKey: string;
  subject: string;
} | null => {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:hola@gabi.mx";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
};

export const isWebPushConfigured = (): boolean => Boolean(getVapidConfig());

export const getVapidPublicKey = (): string | null => getVapidConfig()?.publicKey ?? null;

const configureWebPush = (): boolean => {
  const config = getVapidConfig();
  if (!config) {
    return false;
  }
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return true;
};

export const upsertAsesorPushSubscription = async (input: {
  asesorId: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  userAgent?: string | null;
}): Promise<{ ok: boolean; error?: string }> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "supabase_unavailable" };
  }

  const endpoint = input.endpoint.trim();
  const p256dh = input.keys.p256dh.trim();
  const auth = input.keys.auth.trim();
  if (!endpoint || !p256dh || !auth) {
    return { ok: false, error: "subscription_incomplete" };
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("asesor_push_subscriptions").upsert(
    {
      asesor_id: input.asesorId,
      endpoint,
      p256dh,
      auth,
      user_agent: input.userAgent?.slice(0, 500) ?? null,
      updated_at: now,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const deleteAsesorPushSubscription = async (input: {
  asesorId: string;
  endpoint: string;
}): Promise<{ ok: boolean; error?: string }> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "supabase_unavailable" };
  }

  const { error } = await supabase
    .from("asesor_push_subscriptions")
    .delete()
    .eq("asesor_id", input.asesorId)
    .eq("endpoint", input.endpoint.trim());

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const listAsesorPushSubscriptions = async (
  asesorId: string,
): Promise<AsesorPushSubscription[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("asesor_push_subscriptions")
    .select("id, asesor_id, endpoint, p256dh, auth, user_agent")
    .eq("asesor_id", asesorId);

  if (error || !data) {
    return [];
  }

  return data as AsesorPushSubscription[];
};

const deleteSubscriptionByEndpoint = async (endpoint: string): Promise<void> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }
  await supabase.from("asesor_push_subscriptions").delete().eq("endpoint", endpoint);
};

export const sendPushToAsesor = async (
  asesorId: string,
  payload: CompliancePushPayload,
): Promise<{ sent: number; failed: number; error?: string }> => {
  if (!configureWebPush()) {
    return { sent: 0, failed: 0, error: "web_push_not_configured" };
  }

  const subscriptions = await listAsesorPushSubscriptions(asesorId);
  if (!subscriptions.length) {
    return { sent: 0, failed: 0, error: "no_subscriptions" };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag ?? "gabi-crm-pendientes",
    badgeCount: payload.badgeCount ?? 0,
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 12, urgency: "high" },
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null;
        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscriptionByEndpoint(sub.endpoint);
        }
      }
    }),
  );

  return { sent, failed };
};

export const buildCompliancePushPayload = (input: {
  desarrolloNombre: string;
  overdueCount: number;
  pendingCount: number;
  cadenciaHoyCount: number;
  priorityNombre?: string | null;
  priorityProspectoId?: string | null;
  siteUrl: string;
}): CompliancePushPayload => {
  const total = input.overdueCount + input.pendingCount + input.cadenciaHoyCount;
  const title =
    input.overdueCount > 0
      ? `Gabi · ${input.overdueCount} paso(s) vencido(s)`
      : total > 0
        ? `Gabi · ${total} pendiente(s) en tu CRM`
        : `Gabi · Revisa tu CRM`;

  const parts: string[] = [];
  if (input.priorityNombre) {
    parts.push(`Prioridad: ${input.priorityNombre}`);
  }
  if (input.cadenciaHoyCount > 0) {
    parts.push(`${input.cadenciaHoyCount} perfilamiento(s) hoy`);
  }
  if (!parts.length) {
    parts.push(input.desarrolloNombre);
  }

  const urlPath = input.priorityProspectoId
    ? `/mis-leads?prospecto=${encodeURIComponent(input.priorityProspectoId)}`
    : "/mis-leads";

  return {
    title,
    body: parts.join(" · "),
    url: `${input.siteUrl.replace(/\/$/, "")}${urlPath}`,
    tag: "gabi-crm-pendientes",
    badgeCount: Math.max(total, input.overdueCount),
  };
};

export const buildNewLeadPushPayload = (input: {
  desarrolloNombre: string;
  prospectoNombre: string;
  prospectoId: string;
  telefono?: string | null;
  campanaNombre?: string | null;
  siteUrl: string;
}): CompliancePushPayload => {
  const phone = String(input.telefono ?? "").trim();
  const campana = String(input.campanaNombre ?? "").trim();
  const parts = [
    input.prospectoNombre,
    phone || null,
    campana ? `vía ${campana}` : null,
  ].filter(Boolean);

  return {
    title: `Gabi · Nuevo lead · ${input.desarrolloNombre}`,
    body: parts.join(" · "),
    url: `${input.siteUrl.replace(/\/$/, "")}/mis-leads?prospecto=${encodeURIComponent(input.prospectoId)}`,
    tag: `gabi-nuevo-lead-${input.prospectoId}`,
    badgeCount: 1,
  };
};
