import { NextResponse } from "next/server";
import {
  assertDesarrolloAccess,
  canAccessModule,
} from "@/lib/admin/permissions";
import { replaceProductosForCluster } from "@/lib/admin/inventario-service";
import { getAdminSession } from "@/lib/admin/session";
import { csvRowToInput, parseProductosCsv } from "@/lib/inventario/csv-productos";
import type { ProductoRecomendadoInput } from "@/lib/inventario/productos-recomendados";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "inventario")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      desarrolloId?: string;
      clusterId?: string;
      csv?: string;
      prototipos?: Array<{ id: string; nombre: string }>;
    };

    if (!body.desarrolloId || !body.clusterId || !body.csv?.trim()) {
      return NextResponse.json({ error: "desarrolloId, clusterId y csv son requeridos." }, { status: 400 });
    }

    assertDesarrolloAccess(session.profile, body.desarrolloId);

    const parsed = parseProductosCsv(body.csv);
    if (parsed.errors.length) {
      return NextResponse.json({ error: parsed.errors.join(" ") }, { status: 400 });
    }

    if (!parsed.rows.length) {
      return NextResponse.json({ error: "No hay filas para importar." }, { status: 400 });
    }

    const prototipos = body.prototipos ?? [];
    const inputs: ProductoRecomendadoInput[] = [];
    const rowErrors: string[] = [];

    parsed.rows.forEach((row, index) => {
      const mapped = csvRowToInput(row, {
        desarrolloId: body.desarrolloId!,
        clusterId: body.clusterId!,
        prototipos,
        fallbackOrden: index + 1,
      });

      if (mapped.error) {
        rowErrors.push(mapped.error);
        return;
      }

      if (mapped.input) {
        inputs.push(mapped.input);
      }
    });

    if (rowErrors.length) {
      return NextResponse.json({ error: rowErrors.slice(0, 5).join(" ") }, { status: 400 });
    }

    const productos = await replaceProductosForCluster(
      session.profile,
      body.desarrolloId,
      body.clusterId,
      inputs,
    );

    return NextResponse.json({ productos, imported: productos.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al importar" },
      { status: 500 },
    );
  }
}
