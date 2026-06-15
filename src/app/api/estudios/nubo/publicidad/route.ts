import { NextResponse } from "next/server";
import { getPublishedNuboPublicidad } from "@/lib/estudios/nubo-publicidad-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const published = await getPublishedNuboPublicidad();
    return NextResponse.json(published, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar presupuesto" },
      { status: 500 },
    );
  }
}
