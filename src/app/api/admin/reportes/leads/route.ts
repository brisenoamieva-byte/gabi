import { NextResponse } from "next/server";
import { getLeadsReporte } from "@/lib/admin/leads-reporte-service";
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
  const desarrolloId = searchParams.get("desarrolloId");
  const desde = searchParams.get("desde") ?? undefined;
  const hasta = searchParams.get("hasta") ?? undefined;
  const asesorId = searchParams.get("asesorId") ?? undefined;
  const campanaId = searchParams.get("campanaId") ?? undefined;

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const reporte = await getLeadsReporte({ desarrolloId, desde, hasta, asesorId, campanaId }, session.profile);
    return NextResponse.json({ reporte });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al generar reporte." },
      { status: 500 },
    );
  }
}
