import { NextResponse } from "next/server";
import { canAccessCrmComplianceApi } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { exportComplianceExceptionsCsv } from "@/lib/comercial/compliance-export";
import { getDesarrolloComplianceReport } from "@/lib/comercial/crm-compliance-service";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessCrmComplianceApi(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const report = await getDesarrolloComplianceReport(desarrolloId, session.profile);
    const csv = exportComplianceExceptionsCsv(report);
    const filename = `crm-excepciones-${desarrolloId}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al exportar." },
      { status: 400 },
    );
  }
}
