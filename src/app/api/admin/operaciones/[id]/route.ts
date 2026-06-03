import { NextResponse } from "next/server";
import {
  getOperacionDetail,
  updateOperacionComercial,
  type UpdateOperacionInput,
} from "@/lib/admin/operaciones-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "sembrado")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const detail = await getOperacionDetail(id, session.profile);
    if (!detail) {
      return NextResponse.json({ error: "Operación no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar operación." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "sembrado")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as UpdateOperacionInput;
    const detail = await updateOperacionComercial(id, body, session.profile);
    return NextResponse.json({ detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar operación." },
      { status: 400 },
    );
  }
}
