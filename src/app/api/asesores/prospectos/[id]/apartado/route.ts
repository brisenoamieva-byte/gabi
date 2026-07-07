import { NextResponse } from "next/server";
import {
  createApartadoForAsesor,
  getApartadoContextForAsesor,
  getApartadoPrefillForAsesor,
} from "@/lib/asesores/apartado-service";
import type { CreateApartadoInput } from "@/lib/admin/operaciones-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { searchParams } = new URL(request.url);
  const { id } = await context.params;

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    const unidadId = searchParams.get("unidadId")?.trim();

    if (unidadId) {
      const prefill = await getApartadoPrefillForAsesor(asesorId, id, unidadId);
      return NextResponse.json({ prefill });
    }

    const contextData = await getApartadoContextForAsesor(asesorId, id);
    return NextResponse.json(contextData);
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar apartado." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as CreateApartadoInput & { asesorId?: string };
    const asesorId = resolveAsesorIdForApi(body.asesorId);

    if (!body.unidadId || !body.clienteNombre?.trim()) {
      return NextResponse.json(
        { error: "Completa unidad y nombre del cliente." },
        { status: 400 },
      );
    }

    const operacion = await createApartadoForAsesor(asesorId, id, body);
    return NextResponse.json({ operacion });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al registrar apartado." },
      { status: 400 },
    );
  }
}
