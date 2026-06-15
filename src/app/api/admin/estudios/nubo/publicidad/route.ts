import { NextResponse } from "next/server";
import type { NuboPublicidadPartidaMensual } from "@/lib/estudios/nubo-publicidad-partidas";
import {
  getPublishedNuboPublicidad,
  publishNuboPublicidadPartidas,
  resetNuboPublicidadToStatic,
} from "@/lib/estudios/nubo-publicidad-store";
import { getAdminSession } from "@/lib/admin/session";
import { isSuperAdmin } from "@/lib/admin/permissions";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const published = await getPublishedNuboPublicidad();
    return NextResponse.json(published);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      partidas?: NuboPublicidadPartidaMensual[];
      reset?: boolean;
    };

    if (body.reset) {
      await resetNuboPublicidadToStatic(session.profile.id);
    } else {
      await publishNuboPublicidadPartidas(body.partidas ?? [], session.profile.id);
    }

    const published = await getPublishedNuboPublicidad();
    return NextResponse.json(published);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar" },
      { status: 400 },
    );
  }
}
