import { NextResponse } from "next/server";
import { getResolvedPropuestaComercial } from "@/lib/propuestas/propuesta-overrides-store";
import { getPropuestaMedia, isPropuestaSlug } from "@/lib/propuestas/registry";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!isPropuestaSlug(slug)) {
    return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
  }

  const resolved = await getResolvedPropuestaComercial(slug);
  if (!resolved) {
    return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    propuesta: resolved.data,
    media: getPropuestaMedia(slug),
    meta: resolved.meta,
  });
}
