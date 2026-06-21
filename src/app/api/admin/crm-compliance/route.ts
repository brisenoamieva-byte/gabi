import { NextResponse } from "next/server";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { getDesarrolloComplianceReport } from "@/lib/comercial/crm-compliance-service";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const report = await getDesarrolloComplianceReport(desarrolloId, session.profile);
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar salud CRM." },
      { status: 400 },
    );
  }
}
