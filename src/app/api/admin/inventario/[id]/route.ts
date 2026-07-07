import { NextResponse } from "next/server";
import {
  assertDesarrolloAccess,
  canAccessInventarioApi,
} from "@/lib/admin/permissions";
import {
  deactivateProductoRecomendado,
  getProductoRecomendadoById,
  updateProductoRecomendado,
} from "@/lib/admin/inventario-service";
import { getAdminSession } from "@/lib/admin/session";
import type { ProductoRecomendadoInput } from "@/lib/inventario/productos-recomendados";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessInventarioApi(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const existing = await getProductoRecomendadoById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }

    assertDesarrolloAccess(session.profile, existing.desarrollo_id);

    const body = (await request.json()) as Partial<ProductoRecomendadoInput> & {
      activo?: boolean;
    };

    if (body.estatus !== undefined) {
      return NextResponse.json(
        { error: "La disponibilidad se administra en Sembrado, no aquí." },
        { status: 400 },
      );
    }

    const producto = await updateProductoRecomendado(params.id, body);
    return NextResponse.json({ producto });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessInventarioApi(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    await deactivateProductoRecomendado(session.profile, params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al eliminar" },
      { status: 500 },
    );
  }
}
