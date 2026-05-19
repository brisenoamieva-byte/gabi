import { NextResponse } from "next/server";
import {
  assertDesarrolloAccess,
  canAccessModule,
} from "@/lib/admin/permissions";
import {
  createProductoRecomendado,
  listProductosRecomendados,
  updateProductoRecomendado,
  getProductoRecomendadoById,
} from "@/lib/admin/inventario-service";
import { getAdminSession } from "@/lib/admin/session";
import type { ProductoRecomendadoInput } from "@/lib/inventario/productos-recomendados";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "inventario")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId") ?? undefined;
  const clusterId = searchParams.get("clusterId") ?? undefined;

  try {
    const productos = await listProductosRecomendados(
      { desarrolloId, clusterId, includeInactive: true },
      session.profile,
    );
    return NextResponse.json({ productos });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "inventario")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as ProductoRecomendadoInput;

    if (!body.desarrolloId || !body.clusterId || !body.unidad?.trim() || !body.tipo) {
      return NextResponse.json({ error: "Completa los campos obligatorios." }, { status: 400 });
    }

    assertDesarrolloAccess(session.profile, body.desarrolloId);

    const producto = await createProductoRecomendado(body);
    return NextResponse.json({ producto });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "inventario")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { ids: string[] };

    if (!Array.isArray(body.ids) || !body.ids.length) {
      return NextResponse.json({ error: "IDs requeridos." }, { status: 400 });
    }

    const productos = [];
    for (let index = 0; index < body.ids.length; index += 1) {
      const id = body.ids[index];
      const existing = await getProductoRecomendadoById(id);
      if (!existing) {
        continue;
      }
      assertDesarrolloAccess(session.profile, existing.desarrollo_id);
      productos.push(
        await updateProductoRecomendado(id, { orden: index + 1 }),
      );
    }

    return NextResponse.json({ productos });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al reordenar" },
      { status: 500 },
    );
  }
}
