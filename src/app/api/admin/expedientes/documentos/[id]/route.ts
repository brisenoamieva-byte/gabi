import { NextResponse } from "next/server";
import {
  deactivateExpedienteDocumento,
  getExpedienteDocumentoSignedUrl,
} from "@/lib/admin/expediente-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "expedientes")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const signed = await getExpedienteDocumentoSignedUrl(id, session.profile);
    return NextResponse.json(signed);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al abrir documento." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "expedientes")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    await deactivateExpedienteDocumento(id, session.profile);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al eliminar documento." },
      { status: 500 },
    );
  }
}
