import { NextResponse } from "next/server";
import { getGuardiasHoyForAsesor } from "@/lib/asesores/guardias-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    const guardias = await getGuardiasHoyForAsesor(asesorId, desarrolloId);
    return NextResponse.json({ guardias, guardia: guardias[0] ?? null });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar guardia." },
      { status: 400 },
    );
  }
}
