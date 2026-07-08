import { NextResponse } from "next/server";
import { setDesarrolloOperativo } from "@/lib/admin/catalog-service";
import { canManageDesarrolloOperativo } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await context.params;

  if (!canManageDesarrolloOperativo(session.profile, id)) {
    return NextResponse.json({ error: "Sin permiso para este desarrollo." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { activo?: boolean };
    if (typeof body.activo !== "boolean") {
      return NextResponse.json({ error: "activo (boolean) requerido." }, { status: 400 });
    }

    const desarrollo = await setDesarrolloOperativo(id, body.activo);
    return NextResponse.json({ desarrollo });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar desarrollo." },
      { status: 500 },
    );
  }
}
