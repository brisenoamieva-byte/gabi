import { NextResponse } from "next/server";
import { updateUnidadCuracion } from "@/lib/admin/operaciones-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import type { UnidadCuracionInput } from "@/lib/comercial/sembrado-status";

type RouteContext = { params: Promise<{ id: string }> };

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
    const body = (await request.json()) as UnidadCuracionInput;
    const unidad = await updateUnidadCuracion(id, body, session.profile);
    return NextResponse.json({ unidad });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar." },
      { status: 500 },
    );
  }
}
