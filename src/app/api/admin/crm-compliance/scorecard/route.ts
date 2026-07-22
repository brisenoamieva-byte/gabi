import { NextResponse } from "next/server";
import { canAccessCrmComplianceApi } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { getDesarrolloAsesorScorecard } from "@/lib/comercial/asesor-scorecard";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessCrmComplianceApi(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const url = new URL(request.url);
  const desarrolloId = url.searchParams.get("desarrolloId")?.trim();
  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  const desde = url.searchParams.get("desde")?.trim() || undefined;
  const hasta = url.searchParams.get("hasta")?.trim() || undefined;

  try {
    const report = await getDesarrolloAsesorScorecard(desarrolloId, session.profile, {
      desde,
      hasta,
    });
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al calcular scorecard." },
      { status: 500 },
    );
  }
}
