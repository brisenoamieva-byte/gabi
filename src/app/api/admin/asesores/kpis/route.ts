import { NextResponse } from "next/server";
import { getAsesoresKpis } from "@/lib/admin/asesores-kpi-service";
import { listAsesores } from "@/lib/admin/asesores-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "asesores")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId");
  const desde = searchParams.get("desde") ?? undefined;
  const hasta = searchParams.get("hasta") ?? undefined;

  if (!desarrolloId) {
    return NextResponse.json({ error: "Falta desarrolloId." }, { status: 400 });
  }

  try {
    const asesores = await listAsesores(
      { desarrolloId, includeInactive: true },
      session.profile,
    );
    const kpis = await getAsesoresKpis(
      {
        desarrolloId,
        desde,
        hasta,
        asesorIds: asesores.map((item) => item.id),
      },
      session.profile,
    );

    return NextResponse.json(kpis);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar KPIs" },
      { status: 500 },
    );
  }
}
