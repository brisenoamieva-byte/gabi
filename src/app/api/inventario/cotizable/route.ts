import { NextResponse } from "next/server";
import { listUnidadesCotizablesSembrado } from "@/lib/inventario/sembrado-cotizable";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ productos: [], fuente: "none" });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId");
  const clusterId = searchParams.get("clusterId") ?? undefined;

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const productos = await listUnidadesCotizablesSembrado(desarrolloId, clusterId);
    return NextResponse.json({ productos, fuente: "sembrado", total: productos.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al consultar sembrado." },
      { status: 500 },
    );
  }
}
