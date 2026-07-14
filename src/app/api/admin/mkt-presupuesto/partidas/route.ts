import { NextResponse } from "next/server";
import { createPartida, listPartidas } from "@/lib/admin/mkt-presupuesto-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { isMktPartidaTipo } from "@/lib/comercial/mkt-presupuesto";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "leads") && !canAccessModule(session.profile, "metricas")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const presupuestoId = new URL(request.url).searchParams.get("presupuestoId");
  if (!presupuestoId) {
    return NextResponse.json({ error: "presupuestoId requerido." }, { status: 400 });
  }

  try {
    const partidas = await listPartidas(presupuestoId, session.profile);
    return NextResponse.json({ partidas });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar partidas." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      presupuestoId?: string;
      segmento?: string;
      proveedor?: string | null;
      concepto?: string;
      tipo?: string;
      cantidad?: number;
      montoAutorizado?: number;
      orden?: number;
    };

    if (!body.presupuestoId || !body.segmento?.trim() || !body.concepto?.trim()) {
      return NextResponse.json(
        { error: "presupuestoId, segmento y concepto son obligatorios." },
        { status: 400 },
      );
    }

    const partida = await createPartida(
      body.presupuestoId,
      {
        segmento: body.segmento,
        proveedor: body.proveedor,
        concepto: body.concepto,
        tipo: body.tipo && isMktPartidaTipo(body.tipo) ? body.tipo : "variable",
        cantidad: body.cantidad,
        montoAutorizado: body.montoAutorizado,
        orden: body.orden,
      },
      session.profile,
    );
    return NextResponse.json({ partida }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear partida." },
      { status: 400 },
    );
  }
}
