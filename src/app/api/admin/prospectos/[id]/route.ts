import { NextResponse } from "next/server";
import {
  deactivateProspecto,
  getProspectoById,
  updateProspecto,
  type UpdateProspectoInput,
} from "@/lib/admin/prospectos-service";
import { canAccessModule, canDeleteProspectos } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const prospecto = await getProspectoById(id, session.profile);
    if (!prospecto) {
      return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ prospecto });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar prospecto." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as UpdateProspectoInput;
    const prospecto = await updateProspecto(id, body, session.profile);
    return NextResponse.json({ prospecto });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar prospecto." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canDeleteProspectos(session.profile)) {
    return NextResponse.json(
      { error: "Solo el administrador universal puede eliminar prospectos." },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  try {
    await deactivateProspecto(id, session.profile);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al eliminar prospecto." },
      { status: 400 },
    );
  }
}
