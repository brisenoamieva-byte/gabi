import { NextResponse } from "next/server";
import { completeCadenciaTouch } from "@/lib/comercial/cadencia-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: touchId } = await context.params;

  if (!touchId?.trim()) {
    return NextResponse.json({ error: "Toque no válido." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { asesorId?: string };
    const asesorId = resolveAsesorIdForApi(body.asesorId);
    const touch = await completeCadenciaTouch(asesorId, touchId);
    return NextResponse.json({ touch });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo completar el toque." },
      { status: 400 },
    );
  }
}
