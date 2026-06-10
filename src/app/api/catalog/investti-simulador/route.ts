import { NextResponse } from "next/server";
import { getPublishedInvesttiSimulador } from "@/lib/admin/investti-simulador-service";
export async function GET() {
  try {
    const published = await getPublishedInvesttiSimulador();
    return NextResponse.json(
      {
        config: published.config,
        lotes: published.lotes,
        meta: published.meta,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar simulador Investti" },
      { status: 500 },
    );
  }
}
