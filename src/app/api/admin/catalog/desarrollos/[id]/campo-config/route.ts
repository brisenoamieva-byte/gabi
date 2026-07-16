import { NextResponse } from "next/server";
import {
  getDesarrolloCampoConfig,
  updateDesarrolloCampoConfig,
} from "@/lib/admin/catalog-service";
import { canAccessDesarrollo, isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { normalizeCampoConfig } from "@/lib/catalog/campo-config";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isSuperAdmin(session.profile) && !canAccessDesarrollo(session.profile, id)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const campoConfig = await getDesarrolloCampoConfig(id);
    return NextResponse.json({ campoConfig });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al consultar" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Sin permiso — solo super admin." }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as { campoConfig?: unknown };
    const campoConfig = await updateDesarrolloCampoConfig(
      id,
      normalizeCampoConfig(body.campoConfig),
    );
    return NextResponse.json({ campoConfig });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar" },
      { status: 500 },
    );
  }
}
