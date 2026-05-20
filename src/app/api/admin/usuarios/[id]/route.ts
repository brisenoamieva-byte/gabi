import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { updateAdminUser, type AdminUserUpdateInput } from "@/lib/admin/usuarios-service";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as AdminUserUpdateInput;
    const usuario = await updateAdminUser(id, body, session.userId);
    return NextResponse.json({ usuario });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar" },
      { status: 500 },
    );
  }
}
