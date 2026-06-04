import { NextResponse } from "next/server";
import { listAsesorDisponibilidad } from "@/lib/inventario/asesor-disponibilidad";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ unidades: [] });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId");
  const clusterId = searchParams.get("clusterId") ?? undefined;

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const unidades = await listAsesorDisponibilidad(desarrolloId, clusterId);
    return NextResponse.json({ unidades });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al consultar disponibilidad." },
      { status: 500 },
    );
  }
}
