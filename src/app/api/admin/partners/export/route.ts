import { NextResponse } from "next/server";
import { listPartners } from "@/lib/admin/partners-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { buildXlsxBuffer, excelFilename, xlsxResponse } from "@/lib/admin/excel-export";
import { partnersToExcelSheet } from "@/lib/admin/exports/catalogos-excel";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim() || undefined;
  const comercializadoraId = searchParams.get("comercializadoraId")?.trim() || undefined;

  if (!desarrolloId && !comercializadoraId) {
    return NextResponse.json(
      { error: "desarrolloId o comercializadoraId requerido." },
      { status: 400 },
    );
  }
  if (desarrolloId && !canAccessDesarrollo(session.profile, desarrolloId)) {
    return NextResponse.json({ error: "Sin permiso para este desarrollo." }, { status: 403 });
  }

  try {
    const rows = await listPartners({ desarrolloId, comercializadoraId }, session.profile);
    const buffer = buildXlsxBuffer([partnersToExcelSheet(rows)]);
    return xlsxResponse(buffer, excelFilename("partners", desarrolloId ?? comercializadoraId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al exportar alianzas." },
      { status: 400 },
    );
  }
}
