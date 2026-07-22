import { NextResponse } from "next/server";
import { canAccessCrmComplianceApi } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import {
  exportAsesorScorecardCsv,
  getDesarrolloAsesorScorecard,
} from "@/lib/comercial/asesor-scorecard";

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
    const csv = exportAsesorScorecardCsv(report);
    const filename = `asesor-scorecard-${desarrolloId}-${report.desde}_${report.hasta}.csv`;

    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al exportar scorecard." },
      { status: 400 },
    );
  }
}
