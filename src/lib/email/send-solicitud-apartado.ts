import { getEmailConfig, isEmailConfigured } from "@/lib/email/config";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

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

const sendViaResend = async (params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) => {
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

  const data = (await response.json()) as { message?: string };
  if (!response.ok) {
    throw new Error(data.message ?? `Resend respondió ${response.status}`);
  }
};

const getGerenteEmailsForDesarrollo = async (desarrolloId: string): Promise<string[]> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("admin_profiles")
    .select("email, rol, desarrollos_ids, activo")
    .eq("activo", true);

  const emails = new Set<string>();
  for (const row of data ?? []) {
    const rol = row.rol as string;
    const desarrollos = (row.desarrollos_ids as string[] | null) ?? [];
    if (rol === "superadmin" || rol === "admin") {
      emails.add((row.email as string).trim());
      continue;
    }
    if (rol === "gerente" && desarrollos.includes(desarrolloId)) {
      emails.add((row.email as string).trim());
    }
  }

  return Array.from(emails).filter(Boolean);
};

export const sendSolicitudApartadoEmail = async (input: {
  desarrolloId: string;
  desarrolloNombre: string;
  prospectoId: string;
  prospectoNombre: string;
  asesorNombre: string;
  notas?: string;
  unidadNumero?: string | null;
}) => {
  if (!isEmailConfigured()) {
    return { sent: false, error: "email_not_configured" as const };
  }

  const recipients = await getGerenteEmailsForDesarrollo(input.desarrolloId);
  if (!recipients.length) {
    return { sent: false, error: "no_gerente_email" as const };
  }

  const link = `${getSiteUrl()}/admin/leads?prospecto=${encodeURIComponent(input.prospectoId)}`;
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
    `Regístralo en Admin → Leads → Registrar apartado:`,
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

  for (const to of recipients) {
    await sendViaResend({ to, subject, html, text });
  }

  return { sent: true, recipients };
};
