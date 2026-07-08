import { NextResponse } from "next/server";
import { listSolicitudesApartadoPendientes } from "@/lib/comercial/solicitud-apartado-service";
import { assertDesarrolloAccess, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();
  const prospectoId = searchParams.get("prospectoId")?.trim();

  if (!desarrolloId && !prospectoId) {
    return NextResponse.json({ error: "desarrolloId o prospectoId requerido." }, { status: 400 });
  }

  try {
    if (prospectoId) {
      const { getSolicitudApartadoPendiente } = await import(
        "@/lib/comercial/solicitud-apartado-service"
      );
      const solicitud = await getSolicitudApartadoPendiente(prospectoId);
      return NextResponse.json({ solicitud });
    }

    assertDesarrolloAccess(session.profile, desarrolloId!);
    const solicitudes = await listSolicitudesApartadoPendientes(desarrolloId!);
    return NextResponse.json({ solicitudes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar solicitudes." },
      { status: 400 },
    );
  }
}
