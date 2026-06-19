import { NextResponse } from "next/server";
import { isQaEncuestasAvailable } from "@/lib/admin/qa-satisfaccion-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { buildQaWebhookUrl } from "@/lib/comercial/qa-webhook-auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "metricas")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const migrationOk = await isQaEncuestasAvailable();

  return NextResponse.json({
    migrationOk,
    webhookUrl: buildQaWebhookUrl(),
    secretConfigured: Boolean(process.env.QA_WEBHOOK_SECRET?.trim()),
    migrationFile: migrationOk ? null : "037_prospecto_qa_satisfaccion.sql",
  });
}
