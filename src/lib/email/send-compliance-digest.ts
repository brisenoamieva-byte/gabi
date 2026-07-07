import { getEmailConfig, isEmailConfigured } from "@/lib/email/config";
import type { ComplianceDigestTarget } from "@/lib/comercial/crm-compliance-service";
import type { DesarrolloComplianceReport } from "@/lib/comercial/crm-compliance-service";
import { prospectoEtapaLabel } from "@/lib/comercial/prospecto-etapas";

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

const formatExceptionLines = (target: ComplianceDigestTarget, siteUrl: string): string[] =>
  target.topExceptions.map((row) => {
    const issue = row.issues[0];
    const status = issue?.status === "overdue" ? "VENCIDO" : "Pendiente";
    const label = issue?.stepLabel ?? "Revisar playbook";
    const link = `${siteUrl}/mis-leads?prospecto=${encodeURIComponent(row.prospectoId)}`;
    return `${status}: ${row.nombre} (${prospectoEtapaLabel[row.etapa]}) — ${label}\n${link}`;
  });

export const sendAsesorComplianceDigestEmail = async (
  target: ComplianceDigestTarget,
  desarrolloNombre: string,
  cadenciaHoyCount = 0,
): Promise<{ sent: boolean; error?: string }> => {
  if (!isEmailConfigured()) {
    return { sent: false, error: "email_not_configured" };
  }

  const { siteUrl } = getEmailConfig();
  const lines = formatExceptionLines(target, siteUrl);
  const subject =
    target.overdueCount > 0
      ? `GABI · ${target.overdueCount} paso(s) vencido(s) en tu CRM`
      : `GABI · ${target.exceptionCount} pendiente(s) en tu CRM`;

  const text = [
    `Hola ${target.asesorNombre},`,
    "",
    `Resumen de cumplimiento CRM — ${desarrolloNombre}:`,
    `• Vencidos: ${target.overdueCount}`,
    `• Pendientes: ${target.pendingCount}`,
    ...(cadenciaHoyCount > 0
      ? [`• Perfilamiento hoy: ${cadenciaHoyCount} contacto(s) en tu bandeja`]
      : []),
    "",
    "Atender primero:",
    ...lines,
    "",
    `Bandeja completa: ${siteUrl}/mis-leads`,
    "",
    "— gabi",
  ].join("\n");

  const htmlItems = target.topExceptions
    .map((row) => {
      const issue = row.issues[0];
      const status = issue?.status === "overdue" ? "Vencido" : "Pendiente";
      const label = issue?.stepLabel ?? "Revisar playbook";
      const link = `${siteUrl}/mis-leads?prospecto=${encodeURIComponent(row.prospectoId)}`;
      return `<li><strong>${status}</strong>: ${row.nombre} (${prospectoEtapaLabel[row.etapa]}) — ${label}<br><a href="${link}">Abrir en GABI</a></li>`;
    })
    .join("");

  const html = `
    <p>Hola ${target.asesorNombre},</p>
    <p>Resumen de cumplimiento CRM — <strong>${desarrolloNombre}</strong></p>
    <ul>
      <li>Vencidos: <strong>${target.overdueCount}</strong></li>
      <li>Pendientes: <strong>${target.pendingCount}</strong></li>
      ${cadenciaHoyCount > 0 ? `<li>Perfilamiento hoy: <strong>${cadenciaHoyCount}</strong> contacto(s)</li>` : ""}
    </ul>
    <p><strong>Atender primero:</strong></p>
    <ul>${htmlItems}</ul>
    <p><a href="${siteUrl}/mis-leads">Abrir bandeja en GABI</a></p>
    <p>— gabi</p>
  `;

  try {
    await sendViaResend({ to: target.email, subject, html, text });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "send_failed",
    };
  }
};

export const sendGerenteComplianceDigestEmail = async (
  report: DesarrolloComplianceReport,
  desarrolloNombre: string,
  gerenteEmail: string,
  gerenteNombre: string,
  cadencia?: {
    expiredCount: number;
    overdueTouchesTotal: number;
    dueTodayTotal: number;
  },
): Promise<{ sent: boolean; error?: string }> => {
  if (!isEmailConfigured()) {
    return { sent: false, error: "email_not_configured" };
  }

  const { siteUrl } = getEmailConfig();
  const subject = `GABI · Salud CRM ${desarrolloNombre}: ${report.compliancePct}% cumplimiento`;

  const asesorLines = report.asesores
    .filter((item) => item.overdueIssues > 0 || item.compliancePct < 100)
    .slice(0, 12)
    .map(
      (item) =>
        `${item.asesorNombre}: ${item.compliancePct}% cumplimiento, ${item.overdueIssues} vencido(s), ${item.pendingIssues} pendiente(s)`,
    );

  const exceptionLines = report.exceptions.slice(0, 8).map((row) => {
    const issue = row.issues[0];
    const status = issue?.status === "overdue" ? "VENCIDO" : "Pendiente";
    const label = issue?.stepLabel ?? "Revisar";
    return `${status}: ${row.nombre} (${row.asesorNombre ?? "Sin asesor"}) — ${label}`;
  });

  const text = [
    `Hola ${gerenteNombre},`,
    "",
    `Salud CRM — ${desarrolloNombre}`,
    `• Cumplimiento: ${report.compliancePct}%`,
    `• Confianza de datos: ${report.confidencePct}%`,
    `• Pipeline confiable: ${report.pipelineReliableCount} leads`,
    `• Excluidos del embudo (datos incompletos/vencidos): ${report.pipelineExcludedCount}`,
    ...(cadencia
      ? [
          "",
          "Cadencia de perfilamiento:",
          `• Expiradas sin respuesta (revisar Descartado): ${cadencia.expiredCount}`,
          `• Toques vencidos hoy: ${cadencia.overdueTouchesTotal}`,
          `• Toques pendientes hoy: ${cadencia.dueTodayTotal}`,
        ]
      : []),
    "",
    "Por asesor:",
    ...asesorLines,
    "",
    "Excepciones prioritarias:",
    ...exceptionLines,
    "",
    `Panel: ${siteUrl}/admin/crm-compliance?desarrolloId=${encodeURIComponent(report.desarrolloId)}`,
    cadencia ? `Cadencia: ${siteUrl}/admin/cadencia?desarrolloId=${encodeURIComponent(report.desarrolloId)}` : "",
    "",
    "— gabi",
  ].join("\n");

  const html = `
    <p>Hola ${gerenteNombre},</p>
    <p>Salud CRM — <strong>${desarrolloNombre}</strong></p>
    <ul>
      <li>Cumplimiento: <strong>${report.compliancePct}%</strong></li>
      <li>Confianza de datos: <strong>${report.confidencePct}%</strong></li>
      <li>Pipeline confiable: <strong>${report.pipelineReliableCount}</strong> leads</li>
      <li>Excluidos del embudo: <strong>${report.pipelineExcludedCount}</strong></li>
      ${
        cadencia
          ? `<li>Cadencias expiradas: <strong>${cadencia.expiredCount}</strong></li>
      <li>Toques vencidos hoy: <strong>${cadencia.overdueTouchesTotal}</strong></li>`
          : ""
      }
    </ul>
    <p><a href="${siteUrl}/admin/crm-compliance?desarrolloId=${encodeURIComponent(report.desarrolloId)}">Abrir panel Salud CRM</a>${
      cadencia
        ? ` · <a href="${siteUrl}/admin/cadencia?desarrolloId=${encodeURIComponent(report.desarrolloId)}">Cadencia</a>`
        : ""
    }</p>
    <p>— gabi</p>
  `;

  try {
    await sendViaResend({ to: gerenteEmail, subject, html, text });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "send_failed",
    };
  }
};
