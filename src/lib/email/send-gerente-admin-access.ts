import { adminAuthCallbackUrl } from "@/lib/admin/admin-auth-callback";
import { isEmailConfigured } from "@/lib/email/config";
import { sendViaResend } from "@/lib/email/send-via-resend";
import { resolveSiteUrl } from "@/lib/site-url";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

async function resolvePasswordSetupLink(email: string): Promise<string> {
  const siteUrl = resolveSiteUrl();
  const loginUrl = `${siteUrl}/admin/login?email=${encodeURIComponent(email.trim().toLowerCase())}`;
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return loginUrl;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const redirectTo = adminAuthCallbackUrl(siteUrl);

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: normalizedEmail,
    options: { redirectTo },
  });

  if (!error && data.properties?.action_link) {
    return data.properties.action_link;
  }

  const fallback = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: normalizedEmail,
    options: { redirectTo },
  });

  if (!fallback.error && fallback.data.properties?.action_link) {
    return fallback.data.properties.action_link;
  }

  return loginUrl;
}

export type GerenteAdminAccessEmailResult =
  | { sent: true }
  | { sent: false; error: "email_not_configured" | "invalid_email" | "send_failed"; detail?: string };

/** Correo GABI (Resend) con enlace para crear/restablecer contraseña admin. */
export async function sendGerenteAdminAccessEmail(input: {
  email: string;
  nombre: string;
}): Promise<GerenteAdminAccessEmailResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { sent: false, error: "invalid_email" };
  }

  if (!isEmailConfigured()) {
    return { sent: false, error: "email_not_configured" };
  }

  try {
    const siteUrl = resolveSiteUrl();
    const setupLink = await resolvePasswordSetupLink(email);
    const loginUrl = `${siteUrl}/admin/login?email=${encodeURIComponent(email)}`;
    const subject = "[GABI] Tu acceso al panel admin comercial";

    const text = [
      `Hola ${input.nombre.trim()},`,
      "",
      "Ya tienes acceso de gerencia en GABI Admin (Leads, sembrado, apartados y guardias).",
      "",
      "1. Abre este enlace para crear tu contraseña (solo la primera vez):",
      setupLink,
      "",
      "2. Después entra siempre en:",
      loginUrl,
      "",
      "Usa tu correo y la contraseña que definas. Guárdala en el navegador del celular.",
      "",
      "Si el enlace expiró, pide reenvío desde Admin → Equipo → «Acceso admin · correo».",
    ].join("\n");

    const html = `
      <p>Hola <strong>${input.nombre.trim()}</strong>,</p>
      <p>Ya tienes acceso de <strong>gerencia</strong> en GABI Admin (Leads, sembrado, apartados y guardias).</p>
      <ol>
        <li><a href="${setupLink}"><strong>Crear tu contraseña</strong></a> (solo la primera vez)</li>
        <li>Luego entra en <a href="${loginUrl}">${loginUrl}</a> con tu correo y contraseña</li>
      </ol>
      <p>Tip: guarda la contraseña en el navegador del celular.</p>
      <p style="color:#64748b;font-size:12px">Si el enlace expiró, pide reenvío desde Admin → Equipo.</p>
    `;

    await sendViaResend({ to: email, subject, html, text });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: "send_failed",
      detail: error instanceof Error ? error.message : "Error al enviar correo.",
    };
  }
}

export function formatGerenteAdminAccessEmailHint(result: GerenteAdminAccessEmailResult): string {
  if (result.sent) {
    return "Correo GABI enviado con enlace para crear contraseña.";
  }

  if (result.error === "email_not_configured") {
    return "Sin RESEND_API_KEY en el servidor — configura email en Vercel.";
  }

  if (result.error === "invalid_email") {
    return "Correo del gerente inválido — revisa el email en Equipo.";
  }

  return result.detail
    ? `No se pudo enviar correo GABI: ${result.detail}`
    : "No se pudo enviar correo GABI.";
}
