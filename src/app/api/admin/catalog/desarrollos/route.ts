import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin/permissions";
import {
  createDesarrolloCatalog,
  listDesarrollosCatalog,
  type DesarrolloCatalogInput,
} from "@/lib/admin/catalog-service";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const comercializadoraId = searchParams.get("comercializadoraId") ?? undefined;
  const includeInactive = searchParams.get("includeInactive") === "1";

  try {
    const desarrollos = await listDesarrollosCatalog({ comercializadoraId, includeInactive });
    return NextResponse.json({ desarrollos });
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

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as DesarrolloCatalogInput;

    if (
      !body.id?.trim() ||
      !body.slug?.trim() ||
      !body.nombre?.trim() ||
      !body.comercializadoraId?.trim()
    ) {
      return NextResponse.json(
        { error: "Completa id, slug, nombre y comercializadora." },
        { status: 400 },
      );
    }

    const desarrollo = await createDesarrolloCatalog(body);
    return NextResponse.json({ desarrollo }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear" },
      { status: 500 },
    );
  }
}
