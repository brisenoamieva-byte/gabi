import { NextResponse } from "next/server";
import type { NuboEstudioContenido, NuboEstudioMedia } from "@/lib/estudios/nubo-estudio-types";
import {
  getPublishedNuboContenido,
  publishNuboEstudioContenido,
  publishNuboEstudioMedia,
  resetNuboEstudioContenidoToStatic,
  resetNuboEstudioMediaToStatic,
  resetNuboEstudioAllToStatic,
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
    const published = await getPublishedNuboContenido();
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
      contenido?: NuboEstudioContenido;
      media?: NuboEstudioMedia;
      reset?: boolean | "contenido" | "media" | "all";
    };

    if (body.reset === true || body.reset === "all") {
      const published = await resetNuboEstudioAllToStatic(session.profile.id);
      return NextResponse.json(published);
    }

    if (body.reset === "contenido") {
      const published = await resetNuboEstudioContenidoToStatic(session.profile.id);
      return NextResponse.json(published);
    }

    if (body.reset === "media") {
      const published = await resetNuboEstudioMediaToStatic(session.profile.id);
      return NextResponse.json(published);
    }

    if (body.contenido) {
      await publishNuboEstudioContenido(body.contenido, session.profile.id);
    }

    if (body.media) {
      await publishNuboEstudioMedia(body.media, session.profile.id);
    }

    const published = await getPublishedNuboContenido();
    return NextResponse.json(published);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar" },
      { status: 400 },
    );
  }
}
