import { NextResponse } from "next/server";
import { canAccessCrmComplianceApi } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { getDesarrolloCadenciaReport, ensureCadenciasForDesarrollo } from "@/lib/comercial/cadencia-service";

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
    const report = await getDesarrolloCadenciaReport(desarrolloId);
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar cadencia." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessCrmComplianceApi(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { desarrolloId?: string; action?: string };
    const desarrolloId = body.desarrolloId?.trim();

    if (!desarrolloId) {
      return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
    }

    if (body.action !== "backfill") {
      return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    }

    await ensureCadenciasForDesarrollo(desarrolloId);
    const report = await getDesarrolloCadenciaReport(desarrolloId);

    return NextResponse.json({
      ok: true,
      activeCount: report.activeCount,
      prospectos: report.prospectos.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al sincronizar." },
      { status: 400 },
    );
  }
}
