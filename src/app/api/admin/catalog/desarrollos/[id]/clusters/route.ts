import { NextResponse } from "next/server";
import {
  createClusterCatalog,
  type ClusterCatalogInput,
} from "@/lib/admin/catalog-product-service";
import { assertDesarrolloAccess, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

const assertProductoWrite = (profile: Parameters<typeof assertDesarrolloAccess>[0], desarrolloId: string) => {
  assertDesarrolloAccess(profile, desarrolloId);
  if (!canAccessModule(profile, "catalogo") && !canAccessModule(profile, "guion")) {
    throw new Error("Sin permiso.");
  }
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    assertProductoWrite(session.profile, id);
    const body = (await request.json()) as ClusterCatalogInput;
    const cluster = await createClusterCatalog(id, body);
    return NextResponse.json({ cluster });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear" },
      { status: error instanceof Error && error.message.includes("permiso") ? 403 : 400 },
    );
  }
}
