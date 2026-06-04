import { NextResponse } from "next/server";
import { listExpedientes } from "@/lib/admin/expediente-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

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

  try {
    const expedientes = await listExpedientes(desarrolloId, session.profile);
    return NextResponse.json({ expedientes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar expedientes." },
      { status: 500 },
    );
  }
}
