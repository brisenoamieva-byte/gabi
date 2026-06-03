import { NextResponse } from "next/server";
import { listOperaciones } from "@/lib/admin/operaciones-service";
import { listProductosRecomendados } from "@/lib/admin/inventario-service";
import { applyOperacionEstatusToUnidad } from "@/lib/comercial/unidad-disponibilidad";
import { mapProductoRecomendadoToUnidad } from "@/lib/inventario/productos-recomendados";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ productos: [], curated: false });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId");
  const clusterId = searchParams.get("clusterId");

  if (!desarrolloId || !clusterId) {
    return NextResponse.json({ error: "desarrolloId y clusterId requeridos." }, { status: 400 });
  }

  try {
    const [rows, operaciones] = await Promise.all([
      listProductosRecomendados({ desarrolloId, clusterId }),
      listOperaciones({ desarrolloId }),
    ]);

    const operacionByUnidad = new Map(operaciones.map((item) => [item.unidad_id, item]));
    const productos = rows.map((row) => {
      const merged = applyOperacionEstatusToUnidad(row, operacionByUnidad.get(row.id) ?? null);
      return mapProductoRecomendadoToUnidad(merged);
    });

    return NextResponse.json({ productos, curated: productos.length > 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al consultar" },
      { status: 500 },
    );
  }
}
