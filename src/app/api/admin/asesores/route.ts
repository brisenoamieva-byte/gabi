import { NextResponse } from "next/server";
import {
  assertDesarrolloAccess,
  canAccessModule,
} from "@/lib/admin/permissions";
import { createAsesor, listAsesores } from "@/lib/admin/asesores-service";
import { getAdminSession } from "@/lib/admin/session";
import type { AsesorInput } from "@/lib/asesores/types";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "asesores")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId") ?? undefined;
  const includeInactive = searchParams.get("includeInactive") === "1";

  try {
    const asesores = await listAsesores(
      { desarrolloId, includeInactive },
      session.profile,
    );
    return NextResponse.json({ asesores });
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

  if (!canAccessModule(session.profile, "asesores")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as AsesorInput;

    if (!body.nombre?.trim() || !body.email?.trim()) {
      return NextResponse.json({ error: "Completa nombre y email." }, { status: 400 });
    }

    if (!body.desarrollosIds?.length) {
      return NextResponse.json({ error: "Selecciona el desarrollo para este acceso." }, { status: 400 });
    }

    body.desarrollosIds.forEach((id) => assertDesarrolloAccess(session.profile, id));

    const result = await createAsesor(session.profile, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear" },
      { status: 500 },
    );
  }
}
