import { NextResponse } from "next/server";
import { listExpedientes } from "@/lib/admin/expediente-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { buildXlsxBuffer, excelFilename, xlsxResponse } from "@/lib/admin/excel-export";
import { expedientesToExcelSheet } from "@/lib/admin/exports/expedientes-excel";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "expedientes")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();
  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }
  if (!canAccessDesarrollo(session.profile, desarrolloId)) {
    return NextResponse.json({ error: "Sin permiso para este desarrollo." }, { status: 403 });
  }

  try {
    const rows = await listExpedientes(desarrolloId, session.profile);
    const buffer = buildXlsxBuffer([expedientesToExcelSheet(rows)]);
    return xlsxResponse(buffer, excelFilename("expedientes", desarrolloId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al exportar expedientes." },
      { status: 400 },
    );
  }
}
