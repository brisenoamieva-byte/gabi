import { NextResponse } from "next/server";
import { updateRecorridoContenido } from "@/lib/admin/catalog-service";
import { assertDesarrolloAccess, canAccessModule } from "@/lib/admin/permissions";
import type { RecorridoContenido } from "@/lib/catalog/recorrido-content";
import { getRecorridoContenidoForDesarrollo } from "@/lib/catalog/service";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "guion")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    assertDesarrolloAccess(session.profile, id);
    const recorridoContenido = await getRecorridoContenidoForDesarrollo(id);
    return NextResponse.json({ recorridoContenido });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al consultar" },
      { status: error instanceof Error && error.message.includes("permiso") ? 403 : 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "guion")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    assertDesarrolloAccess(session.profile, id);
    const body = (await request.json()) as { recorridoContenido?: RecorridoContenido };

    if (!body.recorridoContenido || typeof body.recorridoContenido !== "object") {
      return NextResponse.json({ error: "Contenido inválido." }, { status: 400 });
    }

    await updateRecorridoContenido(id, body.recorridoContenido);
    const recorridoContenido = await getRecorridoContenidoForDesarrollo(id);
    return NextResponse.json({ recorridoContenido });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar" },
      { status: error instanceof Error && error.message.includes("permiso") ? 403 : 500 },
    );
  }
}
