import { NextResponse } from "next/server";
import type { NuboPublicidadPartidaMensual } from "@/lib/estudios/nubo-publicidad-partidas";
import { authorizeNuboEditor } from "@/lib/estudios/nubo-editor-auth";
import {
  getPublishedNuboPublicidad,
  publishNuboPublicidadPartidas,
  resetNuboPublicidadToStatic,
} from "@/lib/estudios/nubo-publicidad-store";

export async function GET(request: Request) {
  const editor = await authorizeNuboEditor(request);
  if (!editor) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
  const editor = await authorizeNuboEditor(request);
  if (!editor) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      partidas?: NuboPublicidadPartidaMensual[];
      reset?: boolean;
    };

    if (body.reset) {
      await resetNuboPublicidadToStatic(editor.adminProfileId);
    } else {
      await publishNuboPublicidadPartidas(body.partidas ?? [], editor.adminProfileId);
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
