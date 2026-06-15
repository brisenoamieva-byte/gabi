import { NextResponse } from "next/server";
import type { NuboEstudioContenido, NuboEstudioMedia } from "@/lib/estudios/nubo-estudio-types";
import { authorizeNuboEditor } from "@/lib/estudios/nubo-editor-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import {
  getPublishedNuboContenido,
  publishNuboEstudioContenido,
  publishNuboEstudioMedia,
  resetNuboEstudioAllToStatic,
  resetNuboEstudioContenidoToStatic,
  resetNuboEstudioMediaToStatic,
} from "@/lib/estudios/nubo-publicidad-store";

export async function GET(request: Request) {
  const editor = await authorizeNuboEditor(request);
  if (!editor) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
  const editor = await authorizeNuboEditor(request);
  if (!editor) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      contenido?: NuboEstudioContenido;
      media?: NuboEstudioMedia;
      reset?: boolean | "contenido" | "media" | "all";
    };

    if (body.reset === true || body.reset === "all") {
      const published = await resetNuboEstudioAllToStatic(editor.adminProfileId);
      return NextResponse.json(published);
    }

    if (body.reset === "contenido") {
      const published = await resetNuboEstudioContenidoToStatic(editor.adminProfileId);
      return NextResponse.json(published);
    }

    if (body.reset === "media") {
      const published = await resetNuboEstudioMediaToStatic(editor.adminProfileId);
      return NextResponse.json(published);
    }

    if (body.contenido) {
      const published = await publishNuboEstudioContenido(body.contenido, editor.adminProfileId);
      return NextResponse.json(published);
    }

    if (body.media) {
      const published = await publishNuboEstudioMedia(body.media, editor.adminProfileId);
      return NextResponse.json(published);
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
