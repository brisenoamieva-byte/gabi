import { NextResponse } from "next/server";
import {
  getApartadoContextForAsesor,
  getApartadoPrefillForAsesor,
} from "@/lib/asesores/apartado-service";
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

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Solo gerencia puede registrar apartados. Usa «Solicitar apartado a gerencia» para notificar al gerente.",
    },
    { status: 403 },
  );
}
