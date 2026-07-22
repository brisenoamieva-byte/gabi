import { NextResponse } from "next/server";
import {
  getComercializadoraBySlug,
  listPortalPinComercializadoras,
} from "@/lib/catalog/service";

/** Listado público de comercializadoras activas para acceso PIN (sin credenciales). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim().toLowerCase();

  try {
    if (slug) {
      const record = await getComercializadoraBySlug(slug);
      if (!record) {
        return NextResponse.json({ error: "Comercializadora no encontrada." }, { status: 404 });
      }
      return NextResponse.json({
        portal: {
          id: record.id,
          slug: record.slug,
          nombre: record.nombre,
          logo: record.logo,
          portalPath: record.portalPath,
          colorPrimary: record.colorPrimary,
          colorAccent: record.colorAccent,
        },
      });
    }

    const portals = await listPortalPinComercializadoras();
    return NextResponse.json({ portals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar portales." },
      { status: 500 },
    );
  }
}
