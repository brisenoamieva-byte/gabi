import { NextResponse } from "next/server";
import {
  assertDesarrolloAccess,
  canAccessModule,
} from "@/lib/admin/permissions";
import {
  deleteAsesor,
  getAsesorById,
  updateAsesor,
} from "@/lib/admin/asesores-service";
import { getAdminSession } from "@/lib/admin/session";
import type { AsesorUpdateInput } from "@/lib/asesores/types";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "asesores")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const existing = await getAsesorById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Asesor no encontrado." }, { status: 404 });
    }

    existing.desarrollosIds.forEach((id) => assertDesarrolloAccess(session.profile, id));

    const body = (await request.json()) as AsesorUpdateInput;
    if (body.desarrollosIds?.length) {
      body.desarrollosIds.forEach((id) => assertDesarrolloAccess(session.profile, id));
    }

    const result = await updateAsesor(session.profile, params.id, body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "asesores")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const existing = await getAsesorById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Asesor no encontrado." }, { status: 404 });
    }

    existing.desarrollosIds.forEach((id) => assertDesarrolloAccess(session.profile, id));

    const result = await deleteAsesor(session.profile, params.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al eliminar" },
      { status: 500 },
    );
  }
}
