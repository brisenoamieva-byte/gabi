import { NextResponse } from "next/server";
import {
  getDesarrolloHubHero,
  updateDesarrolloHubHero,
} from "@/lib/admin/catalog-service";
import { assertDesarrolloAccess, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

const assertHubHeroAccess = (profile: Parameters<typeof assertDesarrolloAccess>[0], desarrolloId: string) => {
  if (!canAccessModule(profile, "catalogo") && !canAccessModule(profile, "guion")) {
    throw new Error("Sin permiso.");
  }
  assertDesarrolloAccess(profile, desarrolloId);
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    assertHubHeroAccess(session.profile, id);
    const data = await getDesarrolloHubHero(id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al consultar" },
      { status: error instanceof Error && error.message.includes("permiso") ? 403 : 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    assertHubHeroAccess(session.profile, id);
    const body = (await request.json()) as { hubHeroImage?: string | null };
    if (body.hubHeroImage === undefined) {
      return NextResponse.json({ error: "hubHeroImage requerido." }, { status: 400 });
    }

    const desarrollo = await updateDesarrolloHubHero(id, body.hubHeroImage);
    return NextResponse.json({ hubHeroImage: desarrollo.hubHeroImage });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar" },
      { status: error instanceof Error && error.message.includes("permiso") ? 403 : 400 },
    );
  }
}
