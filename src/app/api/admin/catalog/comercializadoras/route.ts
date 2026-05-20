import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin/permissions";
import {
  createComercializadora,
  listComercializadoras,
  type ComercializadoraInput,
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
  const includeInactive = searchParams.get("includeInactive") === "1";

  try {
    const comercializadoras = await listComercializadoras({ includeInactive });
    return NextResponse.json({ comercializadoras });
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
    const body = (await request.json()) as ComercializadoraInput;

    if (!body.id?.trim() || !body.slug?.trim() || !body.nombre?.trim() || !body.usuario?.trim()) {
      return NextResponse.json(
        { error: "Completa id, slug, nombre y usuario de portal." },
        { status: 400 },
      );
    }

    const comercializadora = await createComercializadora(body);
    return NextResponse.json({ comercializadora }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear" },
      { status: 500 },
    );
  }
}
