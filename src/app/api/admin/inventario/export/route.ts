import { NextResponse } from "next/server";
import { listProductosRecomendados } from "@/lib/admin/inventario-service";
import { canAccessDesarrollo, canAccessInventarioApi } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { buildXlsxBuffer, excelFilename, xlsxResponse } from "@/lib/admin/excel-export";
import { inventarioToExcelSheet } from "@/lib/admin/exports/inventario-excel";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessInventarioApi(session.profile)) {
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
    const rows = await listProductosRecomendados(
      { desarrolloId, includeInactive: true },
      session.profile,
    );
    const buffer = buildXlsxBuffer([inventarioToExcelSheet(rows)]);
    return xlsxResponse(buffer, excelFilename("inventario", desarrolloId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al exportar inventario." },
      { status: 400 },
    );
  }
}
