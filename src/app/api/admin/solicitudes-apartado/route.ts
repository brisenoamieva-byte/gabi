import { NextResponse } from "next/server";
import {
  getSolicitudApartadoPendiente,
  getSolicitudApartadoPendienteById,
  listSolicitudesApartadoPendientes,
  rejectSolicitudApartado,
} from "@/lib/comercial/solicitud-apartado-service";
import {
  assertDesarrolloAccess,
  canAccessModule,
  canRegisterApartado,
} from "@/lib/admin/permissions";
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

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads") || !canRegisterApartado(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { solicitudId?: string; action?: string };
    const solicitudId = body.solicitudId?.trim();
    if (!solicitudId || body.action !== "rechazar") {
      return NextResponse.json(
        { error: "solicitudId y action=rechazar requeridos." },
        { status: 400 },
      );
    }

    const pendiente = await getSolicitudApartadoPendienteById(solicitudId);
    if (!pendiente) {
      return NextResponse.json(
        { error: "No hay solicitud de apartado pendiente para rechazar." },
        { status: 404 },
      );
    }

    assertDesarrolloAccess(session.profile, pendiente.desarrollo_id);
    const solicitud = await rejectSolicitudApartado(solicitudId);
    return NextResponse.json({ solicitud });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al rechazar solicitud." },
      { status: 400 },
    );
  }
}
