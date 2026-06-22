import { NextResponse } from "next/server";
import { authorizeNuboEditor } from "@/lib/estudios/nubo-editor-auth";
import type { PropuestaEditableOverrides } from "@/lib/propuestas/overrides-types";
import { resolveConsultoriaMarca } from "@/lib/brand/consultoria-marca";
import {
  deletePropuestaOverrides,
  extractEditableFromPropuesta,
  getPropuestaOverrides,
  publishPropuestaOverrides,
} from "@/lib/propuestas/propuesta-overrides-store";
import { getPropuestaBySlug, isPropuestaSlug } from "@/lib/propuestas/registry";
import { mergePropuestaComercialData } from "@/lib/propuestas/merge-propuesta";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const editor = await authorizeNuboEditor(request);
  if (!editor) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { slug } = await context.params;
  if (!isPropuestaSlug(slug)) {
    return NextResponse.json({ error: "Propuesta no registrada." }, { status: 404 });
  }

  const base = getPropuestaBySlug(slug)!;
  const overrides = await getPropuestaOverrides(slug);
  const editable: PropuestaEditableOverrides = {
    ...extractEditableFromPropuesta(base),
    ...overrides,
    presentacionMarca: resolveConsultoriaMarca(overrides?.presentacionMarca),
  };

  return NextResponse.json({
    slug,
    editable,
    preview: mergePropuestaComercialData(base, editable),
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

  const { slug } = await context.params;
  if (!isPropuestaSlug(slug)) {
    return NextResponse.json({ error: "Propuesta no registrada." }, { status: 404 });
  }

  const body = (await request.json()) as {
    editable?: PropuestaEditableOverrides;
    reset?: boolean;
  };

  if (body.reset) {
    await deletePropuestaOverrides(slug);
    const base = getPropuestaBySlug(slug)!;
    return NextResponse.json({
      editable: extractEditableFromPropuesta(base),
      preview: base,
      meta: { hasOverrides: false, origin: "static" },
    });
  }

  if (!body.editable) {
    return NextResponse.json({ error: "Falta editable." }, { status: 400 });
  }

  const meta = await publishPropuestaOverrides(slug, body.editable, editor.adminProfileId);
  const base = getPropuestaBySlug(slug)!;

  return NextResponse.json({
    editable: body.editable,
    preview: mergePropuestaComercialData(base, body.editable),
    meta: { ...meta, hasOverrides: true },
  });
}
