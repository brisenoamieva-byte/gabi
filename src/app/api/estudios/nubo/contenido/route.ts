import { NextResponse } from "next/server";
import { getPublishedNuboContenido } from "@/lib/estudios/nubo-publicidad-store";

export async function GET() {
  try {
    const published = await getPublishedNuboContenido();
    return NextResponse.json(published, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar contenido" },
      { status: 500 },
    );
  }
}
