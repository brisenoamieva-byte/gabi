import { NextResponse } from "next/server";
import { getSembradoResumen, listSembradoUnidades } from "@/lib/admin/operaciones-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "sembrado")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId");
  const clusterId = searchParams.get("clusterId") ?? undefined;
  const estatusSembrado = searchParams.get("estatus") ?? undefined;

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const [filas, resumen] = await Promise.all([
      listSembradoUnidades(
        { desarrolloId, clusterId, estatusSembrado },
        session.profile,
      ),
      getSembradoResumen(desarrolloId, session.profile, clusterId),
    ]);

    return NextResponse.json({ filas, resumen });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar sembrado." },
      { status: 500 },
    );
  }
}
