import { NextResponse } from "next/server";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { getVisitasResumen } from "@/lib/visitas/service";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "metricas")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId");
  const days = Number(searchParams.get("days") ?? "30");

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const resumen = await getVisitasResumen(session.profile, {
      desarrolloId,
      days: Number.isFinite(days) ? days : 30,
    });
    return NextResponse.json(resumen);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar métricas." },
      { status: 500 },
    );
  }
}
