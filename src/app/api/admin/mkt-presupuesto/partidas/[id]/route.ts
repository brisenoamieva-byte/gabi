import { NextResponse } from "next/server";
import { deletePartida, updatePartida } from "@/lib/admin/mkt-presupuesto-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { isMktPartidaTipo } from "@/lib/comercial/mkt-presupuesto";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id: partidaId } = await context.params;
  try {
    const body = (await request.json()) as {
      segmento?: string;
      proveedor?: string | null;
      concepto?: string;
      tipo?: string;
      cantidad?: number;
      montoAutorizado?: number;
      orden?: number;
    };

    const partida = await updatePartida(
      partidaId,
      {
        segmento: body.segmento,
        proveedor: body.proveedor,
        concepto: body.concepto,
        tipo: body.tipo && isMktPartidaTipo(body.tipo) ? body.tipo : undefined,
        cantidad: body.cantidad,
        montoAutorizado: body.montoAutorizado,
        orden: body.orden,
      },
      session.profile,
    );
    return NextResponse.json({ partida });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar partida." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id: partidaId } = await context.params;
  try {
    await deletePartida(partidaId, session.profile);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al eliminar partida." },
      { status: 400 },
    );
  }
}
