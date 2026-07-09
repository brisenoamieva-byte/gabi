import { NextResponse } from "next/server";
import { listProductoCatalogForDesarrollo } from "@/lib/admin/catalog-product-service";
import { assertDesarrolloAccess, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

const assertProductoAccess = (profile: Parameters<typeof assertDesarrolloAccess>[0], desarrolloId: string) => {
  assertDesarrolloAccess(profile, desarrolloId);
  if (!canAccessModule(profile, "catalogo") && !canAccessModule(profile, "guion")) {
    throw new Error("Sin permiso.");
  }
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    assertProductoAccess(session.profile, id);
    const producto = await listProductoCatalogForDesarrollo(id);
    return NextResponse.json(producto);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al consultar" },
      { status: error instanceof Error && error.message.includes("permiso") ? 403 : 500 },
    );
  }
}
