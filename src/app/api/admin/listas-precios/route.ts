import { NextResponse } from "next/server";
import {
  activateListaPrecios,
  createListaFromIncremento,
  createListaFromInventario,
  getListaPreciosDetail,
  listListasPrecios,
  previewIncrementoLista,
} from "@/lib/admin/listas-precios-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "sembrado")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();
  const listaId = searchParams.get("listaId")?.trim();
  const preview = searchParams.get("preview") === "1";
  const incrementoPct = Number(searchParams.get("incrementoPct") ?? "0");

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }
  if (!canAccessDesarrollo(session.profile, desarrolloId)) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  try {
    if (listaId) {
      const lista = await getListaPreciosDetail(listaId, session.profile);
      if (!lista || lista.desarrollo_id !== desarrolloId) {
        return NextResponse.json({ error: "Lista no encontrada." }, { status: 404 });
      }
      return NextResponse.json({ lista });
    }

    if (preview) {
      const data = await previewIncrementoLista(desarrolloId, incrementoPct, session.profile);
      return NextResponse.json(data);
    }

    const listas = await listListasPrecios(desarrolloId, session.profile);
    const activa = listas.find((item) => item.estado === "activa") ?? null;
    return NextResponse.json({ listas, activa });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar listas." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "sembrado")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      action?: "incremento" | "seed" | "activar";
      desarrolloId?: string;
      listaId?: string;
      incrementoPct?: number;
      vigenciaDesde?: string;
      nombre?: string;
      notas?: string;
    };

    if (body.action === "activar") {
      if (!body.listaId) {
        return NextResponse.json({ error: "listaId requerido." }, { status: 400 });
      }
      const lista = await activateListaPrecios(body.listaId, session.profile);
      return NextResponse.json({ lista });
    }

    if (!body.desarrolloId?.trim()) {
      return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
    }
    if (!canAccessDesarrollo(session.profile, body.desarrolloId)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }
    if (!body.vigenciaDesde?.trim()) {
      return NextResponse.json({ error: "vigenciaDesde requerida." }, { status: 400 });
    }

    if (body.action === "seed") {
      const lista = await createListaFromInventario(
        {
          desarrolloId: body.desarrolloId.trim(),
          vigenciaDesde: body.vigenciaDesde.trim(),
          nombre: body.nombre,
          notas: body.notas,
        },
        session.profile,
      );
      return NextResponse.json({ lista }, { status: 201 });
    }

    if (body.incrementoPct == null || !Number.isFinite(Number(body.incrementoPct))) {
      return NextResponse.json({ error: "incrementoPct requerido." }, { status: 400 });
    }

    const lista = await createListaFromIncremento(
      {
        desarrolloId: body.desarrolloId.trim(),
        incrementoPct: Number(body.incrementoPct),
        vigenciaDesde: body.vigenciaDesde.trim(),
        nombre: body.nombre,
        notas: body.notas,
      },
      session.profile,
    );
    return NextResponse.json({ lista }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear lista." },
      { status: 400 },
    );
  }
}
