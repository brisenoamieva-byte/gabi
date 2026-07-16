import { NextResponse } from "next/server";
import {
  activateListaPrecios,
  getListaPreciosDetail,
  updateListaPreciosUnidades,
} from "@/lib/admin/listas-precios-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "sembrado")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const lista = await getListaPreciosDetail(id, session.profile);
    if (!lista) {
      return NextResponse.json({ error: "Lista no encontrada." }, { status: 404 });
    }
    if (!canAccessDesarrollo(session.profile, lista.desarrollo_id)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }
    return NextResponse.json({ lista });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar lista." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "sembrado")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = (await request.json()) as {
      action?: "activar" | "precios";
      precios?: Array<{ unidadId: string; precioLista: number }>;
    };

    if (body.action === "activar") {
      const lista = await activateListaPrecios(id, session.profile);
      return NextResponse.json({ lista });
    }

    if (!body.precios?.length) {
      return NextResponse.json({ error: "precios requeridos." }, { status: 400 });
    }

    const lista = await updateListaPreciosUnidades(id, body.precios, session.profile);
    return NextResponse.json({ lista });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar lista." },
      { status: 400 },
    );
  }
}
