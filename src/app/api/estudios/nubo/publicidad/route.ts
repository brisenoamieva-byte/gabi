import { NextResponse } from "next/server";
import { getPublishedNuboPublicidad } from "@/lib/estudios/nubo-publicidad-store";

export async function GET() {
  try {
    const published = await getPublishedNuboPublicidad();
    return NextResponse.json(published, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar presupuesto" },
      { status: 500 },
    );
  }
}
