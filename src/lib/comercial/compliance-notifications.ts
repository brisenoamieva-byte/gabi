import { getAsesorById } from "@/lib/admin/asesores-service";
import type { ComplianceDigestTarget } from "@/lib/comercial/crm-compliance-service";
import { isWhatsAppCloudConfigured } from "@/lib/whatsapp/config";
import { sendAsesorComplianceNudge } from "@/lib/whatsapp/meta-cloud-api";

export const sendComplianceWhatsAppNudge = async (
  target: ComplianceDigestTarget,
  desarrolloNombre: string,
): Promise<{ sent: boolean; error?: string; skippedReason?: string }> => {
  if (!isWhatsAppCloudConfigured(target.desarrolloId)) {
    return { sent: false, skippedReason: "whatsapp_not_configured" };
  }

  const asesor = await getAsesorById(target.asesorId);
  const telefono = asesor?.telefono?.trim();
  if (!telefono) {
    return { sent: false, skippedReason: "no_phone" };
  }

  const priority = target.topExceptions[0];
  const issue = priority?.issues[0];
  const priorityLabel = priority
    ? `${priority.nombre}: ${issue?.stepLabel ?? "Revisar playbook"}`
    : "Revisar bandeja de leads";

  const result = await sendAsesorComplianceNudge(
    target.desarrolloId,
    telefono,
    target.asesorNombre,
    target.overdueCount,
    desarrolloNombre,
    priorityLabel,
  );

  if (result.sent) {
    return { sent: true };
  }

  if (result.skippedReason) {
    return { sent: false, skippedReason: result.skippedReason };
  }

  return { sent: false, error: result.error ?? "send_failed" };
};
