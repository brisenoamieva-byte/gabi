import { NextResponse } from "next/server";
import { updateCampana, type UpdateCampanaInput } from "@/lib/admin/campanas-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

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
    const body = (await request.json()) as UpdateCampanaInput;
    const campana = await updateCampana(id, body, session.profile);
    return NextResponse.json({ campana });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar campaña." },
      { status: 400 },
    );
  }
}
