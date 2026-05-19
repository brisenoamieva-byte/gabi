import { NextResponse } from "next/server";
import { setDocumentoActivo } from "@/lib/admin/documentos-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "documentos")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { activo?: boolean };
    await setDocumentoActivo(session.profile, params.id, body.activo ?? false);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar" },
      { status: 500 },
    );
  }
}
