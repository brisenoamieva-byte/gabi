import { NextResponse } from "next/server";
import {
  cancelOperacionComercial,
  type CancelOperacionInput,
} from "@/lib/admin/operaciones-service";
import { canAccessModule, canRegisterApartado } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "sembrado")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  if (!canRegisterApartado(session.profile)) {
    return NextResponse.json(
      { error: "Solo gerentes pueden cancelar apartados." },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as CancelOperacionInput;
    const operacion = await cancelOperacionComercial(id, body, session.profile);
    return NextResponse.json({ operacion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cancelar operación." },
      { status: 400 },
    );
  }
}
