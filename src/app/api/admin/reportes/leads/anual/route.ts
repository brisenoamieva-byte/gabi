import { NextResponse } from "next/server";
import { getLeadsReporteAnual } from "@/lib/admin/leads-reporte-anual-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "metricas")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const anioRaw = searchParams.get("anio");
  const desarrolloId = searchParams.get("desarrolloId") ?? undefined;
  const anio = anioRaw ? Number(anioRaw) : new Date().getFullYear();

  if (!Number.isFinite(anio) || anio < 2020 || anio > 2100) {
    return NextResponse.json({ error: "Año inválido." }, { status: 400 });
  }

  try {
    const reporte = await getLeadsReporteAnual({ anio, desarrolloId }, session.profile);
    return NextResponse.json({ reporte });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al generar reporte anual." },
      { status: 500 },
    );
  }
}
