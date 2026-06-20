import { NextResponse } from "next/server";
import { generateApartadoPack, getExpedienteDetail } from "@/lib/admin/expediente-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ operacionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "expedientes")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { operacionId } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as { confirmReplace?: boolean };
    const result = await generateApartadoPack(
      operacionId,
      session.profile,
      session.userId,
      { confirmReplace: body.confirmReplace ?? false },
    );

    const expediente = await getExpedienteDetail(operacionId, session.profile);

    return NextResponse.json({ result, expediente });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al generar documentos." },
      { status: 500 },
    );
  }
}
