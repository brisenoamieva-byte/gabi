import { NextResponse } from "next/server";
import { canAccessCrmComplianceApi } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { getDesarrolloCadenciaReport } from "@/lib/comercial/cadencia-service";
import { getDesarrolloComplianceReport } from "@/lib/comercial/crm-compliance-service";
import { buildGarantiaSlaReport } from "@/lib/comercial/garantia-sla";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessCrmComplianceApi(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const desarrolloId = new URL(request.url).searchParams.get("desarrolloId")?.trim();
  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const [compliance, cadencia] = await Promise.all([
      getDesarrolloComplianceReport(desarrolloId, session.profile),
      getDesarrolloCadenciaReport(desarrolloId).catch(() => null),
    ]);

    const report = buildGarantiaSlaReport(compliance, cadencia);
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al calcular garantía SLA." },
      { status: 500 },
    );
  }
}
