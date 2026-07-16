import { NextResponse } from "next/server";
import { listDesarrollosWithCrmPlaybookEnabled } from "@/lib/comercial/crm-playbook-enablement";
import {
  getDesarrolloComplianceReport,
  listComplianceDigestTargets,
  logComplianceDigestSent,
  wasComplianceDigestSentToday,
} from "@/lib/comercial/crm-compliance-service";
import { getCrmPlaybookConfig } from "@/lib/comercial/crm-playbook-service";
import { getDesarrolloById } from "@/lib/catalog/service";
import {
  sendAsesorComplianceDigestEmail,
  sendGerenteComplianceDigestEmail,
} from "@/lib/email/send-compliance-digest";
import {
  sendComplianceWhatsAppNudge,
} from "@/lib/comercial/compliance-notifications";
import { getDesarrolloCadenciaReport, listCadenciaHoyForAsesor } from "@/lib/comercial/cadencia-service";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const authorizeCron = (request: Request): boolean => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return true;
  }

  return request.headers.get("x-cron-secret") === secret;
};

async function runComplianceDigest(): Promise<{
  desarrollos: number;
  asesorEmails: number;
  asesorWhatsApp: number;
  gerenteEmails: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let asesorEmails = 0;
  let asesorWhatsApp = 0;
  let gerenteEmails = 0;
  let skipped = 0;
  let desarrollos = 0;

  const supabase = createSupabaseServiceClient();

  for (const desarrolloId of await listDesarrollosWithCrmPlaybookEnabled()) {
    const config = await getCrmPlaybookConfig(desarrolloId);
    if (!config?.enabled) {
      continue;
    }

    desarrollos += 1;
    const desarrollo = await getDesarrolloById(desarrolloId);
    const desarrolloNombre = desarrollo?.nombre ?? desarrolloId;

    const targets = await listComplianceDigestTargets(desarrolloId);

    for (const target of targets) {
      const alreadySent = await wasComplianceDigestSentToday(
        desarrolloId,
        "asesor",
        target.asesorId,
      );

      if (alreadySent) {
        skipped += 1;
        continue;
      }

      const result = await sendAsesorComplianceDigestEmail(
        target,
        desarrolloNombre,
        (await listCadenciaHoyForAsesor(target.asesorId, desarrolloId)).length,
      );

      await logComplianceDigestSent({
        desarrolloId,
        recipientType: "asesor",
        recipientId: target.asesorId,
        email: target.email,
        overdueCount: target.overdueCount,
        exceptionCount: target.exceptionCount,
        status: result.sent ? "sent" : "failed",
        errorMessage: result.error,
      });

      if (result.sent) {
        asesorEmails += 1;
      } else if (result.error) {
        errors.push(`asesor ${target.asesorId}: ${result.error}`);
      }

      if (target.overdueCount > 0) {
        const whatsappAlreadySent = await wasComplianceDigestSentToday(
          desarrolloId,
          "asesor",
          target.asesorId,
          "whatsapp",
        );

        if (whatsappAlreadySent) {
          skipped += 1;
        } else {
          const whatsappResult = await sendComplianceWhatsAppNudge(target, desarrolloNombre);

          await logComplianceDigestSent({
            desarrolloId,
            recipientType: "asesor",
            recipientId: target.asesorId,
            email: target.email,
            overdueCount: target.overdueCount,
            exceptionCount: target.exceptionCount,
            status: whatsappResult.sent ? "sent" : "failed",
            channel: "whatsapp",
            errorMessage: whatsappResult.error ?? whatsappResult.skippedReason,
          });

          if (whatsappResult.sent) {
            asesorWhatsApp += 1;
          } else if (whatsappResult.error) {
            errors.push(`whatsapp ${target.asesorId}: ${whatsappResult.error}`);
          }
        }
      }
    }

    const report = await getDesarrolloComplianceReport(desarrolloId);
    const cadenciaReport = config?.enabled ? await getDesarrolloCadenciaReport(desarrolloId) : null;

    const cadenciaNeedsAttention =
      cadenciaReport &&
      (cadenciaReport.expiredCount > 0 || cadenciaReport.overdueTouchesTotal > 0);

    if ((report.exceptionCount === 0 && !cadenciaNeedsAttention) || !supabase) {
      continue;
    }

    const { data: gerentes } = await supabase
      .from("admin_profiles")
      .select("id, nombre, email, rol, desarrollos_ids, activo")
      .eq("activo", true)
      .in("rol", ["gerente", "superadmin"]);

    const eligibleGerentes = (gerentes ?? []).filter((row) => {
      if (row.rol === "superadmin") {
        return true;
      }
      const ids = (row.desarrollos_ids as string[] | null) ?? [];
      return ids.includes(desarrolloId);
    });

    for (const gerente of eligibleGerentes) {
      const gerenteId = gerente.id as string;
      const gerenteEmail = (gerente.email as string)?.trim();
      if (!gerenteEmail) {
        continue;
      }

      const alreadySent = await wasComplianceDigestSentToday(desarrolloId, "gerente", gerenteId);
      if (alreadySent) {
        skipped += 1;
        continue;
      }

      const result = await sendGerenteComplianceDigestEmail(
        report,
        desarrolloNombre,
        gerenteEmail,
        (gerente.nombre as string) ?? "Gerente",
        cadenciaReport
          ? {
              expiredCount: cadenciaReport.expiredCount,
              overdueTouchesTotal: cadenciaReport.overdueTouchesTotal,
              dueTodayTotal: cadenciaReport.dueTodayTotal,
            }
          : undefined,
      );

      await logComplianceDigestSent({
        desarrolloId,
        recipientType: "gerente",
        recipientId: gerenteId,
        email: gerenteEmail,
        overdueCount: report.overdueCount,
        exceptionCount: report.exceptionCount,
        status: result.sent ? "sent" : "failed",
        errorMessage: result.error,
      });

      if (result.sent) {
        gerenteEmails += 1;
      } else if (result.error) {
        errors.push(`gerente ${gerenteId}: ${result.error}`);
      }
    }
  }

  return { desarrollos, asesorEmails, asesorWhatsApp, gerenteEmails, skipped, errors };
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await runComplianceDigest();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error en digest de cumplimiento.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
