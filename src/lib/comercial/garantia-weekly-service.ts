import { getDesarrolloCampoConfig } from "@/lib/admin/catalog-service";
import { getDesarrolloById } from "@/lib/catalog/service";
import {
  isGarantiaWeeklyReportEnabled,
  type DesarrolloCampoConfig,
} from "@/lib/catalog/campo-config";
import { getDesarrolloCadenciaReport } from "@/lib/comercial/cadencia-service";
import {
  getDesarrolloComplianceReport,
  logComplianceDigestSent,
} from "@/lib/comercial/crm-compliance-service";
import { listDesarrollosWithCrmPlaybookEnabled } from "@/lib/comercial/crm-playbook-enablement";
import { getGerenteEmailsForDesarrollo } from "@/lib/comercial/gerente-email-recipients";
import { buildGarantiaSlaReport, type GarantiaSlaReport } from "@/lib/comercial/garantia-sla";
import { sendGarantiaWeeklyReportEmail } from "@/lib/email/send-garantia-weekly";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isWhatsAppCloudConfigured } from "@/lib/whatsapp/config";
import { sendAsesorComplianceNudge } from "@/lib/whatsapp/meta-cloud-api";

export const GARANTIA_WEEKLY_RECIPIENT_ID = "__garantia_sla_weekly__";

const startOfIsoWeekUtc = (now = new Date()): Date => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  if (day !== 1) {
    d.setUTCDate(d.getUTCDate() - (day - 1));
  }
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const wasGarantiaWeeklySentThisWeek = async (
  desarrolloId: string,
  channel: "email" | "whatsapp" | "push",
): Promise<boolean> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return false;
  }

  const weekStart = startOfIsoWeekUtc();
  const { count, error } = await supabase
    .from("compliance_digest_log")
    .select("id", { count: "exact", head: true })
    .eq("desarrollo_id", desarrolloId)
    .eq("recipient_type", "gerente")
    .eq("recipient_id", GARANTIA_WEEKLY_RECIPIENT_ID)
    .eq("channel", channel)
    .eq("status", "sent")
    .gte("sent_at", weekStart.toISOString());

  if (error) {
    return false;
  }
  return (count ?? 0) > 0;
};

const loadCampoConfigSafe = async (desarrolloId: string): Promise<DesarrolloCampoConfig> => {
  try {
    return await getDesarrolloCampoConfig(desarrolloId);
  } catch {
    return {};
  }
};

export const buildGarantiaReportForDesarrollo = async (
  desarrolloId: string,
): Promise<{ report: GarantiaSlaReport; desarrolloNombre: string; campoConfig: DesarrolloCampoConfig }> => {
  const [compliance, cadencia, desarrollo, campoConfig] = await Promise.all([
    getDesarrolloComplianceReport(desarrolloId),
    getDesarrolloCadenciaReport(desarrolloId).catch(() => null),
    getDesarrolloById(desarrolloId),
    loadCampoConfigSafe(desarrolloId),
  ]);

  return {
    report: buildGarantiaSlaReport(compliance, cadencia),
    desarrolloNombre: desarrollo?.nombre ?? desarrolloId,
    campoConfig,
  };
};

const resolveWeeklyEmails = async (
  desarrolloId: string,
  campoConfig: DesarrolloCampoConfig,
): Promise<string[]> => {
  const set = new Set<string>();
  for (const email of campoConfig.garantiaContrato?.recipientEmails ?? []) {
    if (email.trim()) set.add(email.trim().toLowerCase());
  }
  for (const email of await getGerenteEmailsForDesarrollo(desarrolloId)) {
    set.add(email);
  }
  return Array.from(set);
};

const resolveWeeklyPhones = (campoConfig: DesarrolloCampoConfig): string[] => {
  const set = new Set<string>();
  for (const phone of campoConfig.garantiaContrato?.recipientPhones ?? []) {
    if (phone.trim()) set.add(phone.trim());
  }
  return Array.from(set);
};

export type GarantiaWeeklySendResult = {
  desarrolloId: string;
  emailsSent: number;
  whatsappSent: number;
  skipped: number;
  errors: string[];
  report: GarantiaSlaReport;
};

export const sendGarantiaWeeklyForDesarrollo = async (
  desarrolloId: string,
  options?: { force?: boolean },
): Promise<GarantiaWeeklySendResult> => {
  const force = Boolean(options?.force);
  const errors: string[] = [];
  let emailsSent = 0;
  let whatsappSent = 0;
  let skipped = 0;

  const { report, desarrolloNombre, campoConfig } = await buildGarantiaReportForDesarrollo(
    desarrolloId,
  );

  if (!report.playbookEnabled) {
    return {
      desarrolloId,
      emailsSent: 0,
      whatsappSent: 0,
      skipped: 1,
      errors: ["playbook_disabled"],
      report,
    };
  }

  if (!force && !isGarantiaWeeklyReportEnabled(campoConfig) && !campoConfig.garantiaContrato?.enabled) {
    // Si el contrato no está marcado, igual enviamos a gerentes Gabi cuando hay playbook
    // (piloto). Si weekly explícitamente false, skip.
    if (campoConfig.garantiaContrato?.weeklyReportEnabled === false) {
      return {
        desarrolloId,
        emailsSent: 0,
        whatsappSent: 0,
        skipped: 1,
        errors: [],
        report,
      };
    }
  }

  const planLabel = campoConfig.garantiaContrato?.planLabel;
  const notes = campoConfig.garantiaContrato?.notes;
  const emails = await resolveWeeklyEmails(desarrolloId, campoConfig);
  const phones = resolveWeeklyPhones(campoConfig);

  if (!force && (await wasGarantiaWeeklySentThisWeek(desarrolloId, "email"))) {
    skipped += 1;
  } else {
    for (const to of emails) {
      const result = await sendGarantiaWeeklyReportEmail({
        to,
        desarrolloNombre,
        report,
        planLabel,
        contractNotes: notes,
      });

      await logComplianceDigestSent({
        desarrolloId,
        recipientType: "gerente",
        recipientId: GARANTIA_WEEKLY_RECIPIENT_ID,
        email: to,
        overdueCount: report.compliance.overdueCount,
        exceptionCount: report.compliance.exceptionCount,
        status: result.sent ? "sent" : "failed",
        channel: "email",
        errorMessage: result.error,
      });

      if (result.sent) {
        emailsSent += 1;
      } else if (result.error) {
        errors.push(`email ${to}: ${result.error}`);
      }
    }

    if (!emails.length) {
      errors.push("sin_destinatarios_email");
    }
  }

  if (!force && (await wasGarantiaWeeklySentThisWeek(desarrolloId, "whatsapp"))) {
    skipped += 1;
  } else if (phones.length && isWhatsAppCloudConfigured(desarrolloId)) {
    const priority = `${report.sealLabel} · score ${report.garantiaScorePct}%`;
    for (const phone of phones) {
      const result = await sendAsesorComplianceNudge(
        desarrolloId,
        phone,
        "Gerencia",
        Math.max(report.compliance.overdueCount, 1),
        desarrolloNombre,
        priority,
      );

      await logComplianceDigestSent({
        desarrolloId,
        recipientType: "gerente",
        recipientId: GARANTIA_WEEKLY_RECIPIENT_ID,
        email: phone,
        overdueCount: report.compliance.overdueCount,
        exceptionCount: report.compliance.exceptionCount,
        status: result.sent ? "sent" : "failed",
        channel: "whatsapp",
        errorMessage: result.error ?? result.skippedReason,
      });

      if (result.sent) {
        whatsappSent += 1;
      } else {
        errors.push(`whatsapp ${phone}: ${result.error ?? result.skippedReason ?? "fail"}`);
      }
    }
  }

  return {
    desarrolloId,
    emailsSent,
    whatsappSent,
    skipped,
    errors,
    report,
  };
};

export const runGarantiaWeeklyReports = async (options?: {
  force?: boolean;
  desarrolloId?: string;
}): Promise<{
  desarrollos: number;
  emailsSent: number;
  whatsappSent: number;
  skipped: number;
  errors: string[];
}> => {
  const ids = options?.desarrolloId
    ? [options.desarrolloId]
    : await listDesarrollosWithCrmPlaybookEnabled();

  let desarrollos = 0;
  let emailsSent = 0;
  let whatsappSent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const id of ids) {
    desarrollos += 1;
    const result = await sendGarantiaWeeklyForDesarrollo(id, { force: options?.force });
    emailsSent += result.emailsSent;
    whatsappSent += result.whatsappSent;
    skipped += result.skipped;
    errors.push(...result.errors.map((e) => `${id}: ${e}`));
  }

  return { desarrollos, emailsSent, whatsappSent, skipped, errors };
};
