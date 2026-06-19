import { NextResponse } from "next/server";
import { authorizeNuboEditor } from "@/lib/estudios/nubo-editor-auth";
import {
  deleteCorredorDesarrolloOverrides,
  extractEditableFromDesarrollo,
  getCorredorDesarrolloOverrides,
  publishCorredorDesarrolloOverrides,
} from "@/lib/corredor/corredor-overrides-store";
import type { CorredorDesarrolloEditableOverrides } from "@/lib/corredor/overrides-types";
import { mergeCorredorDesarrollo } from "@/lib/corredor/merge-desarrollo";
import { getCorredorDesarrolloById, isCorredorDesarrolloId } from "@/lib/corredor/zona-sur-seed";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const editor = await authorizeNuboEditor(request);
  if (!editor) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isCorredorDesarrolloId(id)) {
    return NextResponse.json({ error: "Desarrollo no registrado." }, { status: 404 });
  }

  const base = getCorredorDesarrolloById(id)!;
  const overrides = await getCorredorDesarrolloOverrides(id);
  const editable = overrides ?? extractEditableFromDesarrollo(base);

  return NextResponse.json({
    id,
    editable,
    preview: mergeCorredorDesarrollo(base, editable),
    meta: {
      hasOverrides: Boolean(overrides),
      origin: overrides ? "supabase" : "static",
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const editor = await authorizeNuboEditor(request);
  if (!editor) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isCorredorDesarrolloId(id)) {
    return NextResponse.json({ error: "Desarrollo no registrado." }, { status: 404 });
  }

  const body = (await request.json()) as {
    editable?: CorredorDesarrolloEditableOverrides;
    reset?: boolean;
  };

  const base = getCorredorDesarrolloById(id)!;

  if (body.reset) {
    await deleteCorredorDesarrolloOverrides(id);
    return NextResponse.json({
      editable: extractEditableFromDesarrollo(base),
      preview: base,
      meta: { hasOverrides: false, origin: "static" },
    });
  }

  if (!body.editable) {
    return NextResponse.json({ error: "Falta editable." }, { status: 400 });
  }

  const meta = await publishCorredorDesarrolloOverrides(
    id,
    body.editable,
    editor.adminProfileId,
  );

  return NextResponse.json({
    editable: body.editable,
    preview: mergeCorredorDesarrollo(base, body.editable),
    meta: { ...meta, hasOverrides: true },
  });
}
