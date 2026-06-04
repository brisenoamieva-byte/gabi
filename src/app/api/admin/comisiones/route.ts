import { NextResponse } from "next/server";
import {
  crearSolicitudComision,
  listSolicitudesComision,
  listSolicitudesComisionRows,
  resolverSolicitudComision,
} from "@/lib/admin/comision-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import type { ComisionPagoTrigger } from "@/lib/comercial/comision-reglas";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "expedientes")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim() || undefined;
  const operacionId = searchParams.get("operacionId") ?? undefined;
  const estado = searchParams.get("estado") ?? undefined;
  const enriched = searchParams.get("enriched") === "1";

  try {
    if (enriched) {
      const result = await listSolicitudesComisionRows({ desarrolloId, estado }, session.profile);
      return NextResponse.json(result);
    }

    if (!desarrolloId) {
      return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
    }

    const solicitudes = await listSolicitudesComision(
      { desarrolloId, operacionId, estado },
      session.profile,
    );
    return NextResponse.json({ solicitudes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar solicitudes." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "expedientes")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      operacionId?: string;
      notas?: string;
      trigger?: ComisionPagoTrigger;
    };

    if (!body.operacionId?.trim()) {
      return NextResponse.json({ error: "operacionId requerido." }, { status: 400 });
    }

    const solicitud = await crearSolicitudComision({
      operacionId: body.operacionId.trim(),
      notas: body.notas,
      trigger: body.trigger,
      adminId: session.userId,
      profile: session.profile,
    });

    return NextResponse.json({ solicitud }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear solicitud." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "expedientes")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      solicitudId?: string;
      accion?: "autorizar" | "rechazar" | "facturar";
      motivoRechazo?: string;
    };

    if (!body.solicitudId || !body.accion) {
      return NextResponse.json({ error: "solicitudId y accion requeridos." }, { status: 400 });
    }

    const solicitud = await resolverSolicitudComision({
      solicitudId: body.solicitudId,
      accion: body.accion,
      motivoRechazo: body.motivoRechazo,
      adminId: session.userId,
      profile: session.profile,
    });

    return NextResponse.json({ solicitud });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al resolver solicitud." },
      { status: 400 },
    );
  }
}
