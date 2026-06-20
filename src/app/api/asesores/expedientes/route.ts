import { NextResponse } from "next/server";
import { getExpedienteSummaryForProspecto } from "@/lib/asesores/expediente-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prospectoId = searchParams.get("prospectoId")?.trim();

  if (!prospectoId) {
    return NextResponse.json({ error: "prospectoId requerido." }, { status: 400 });
  }

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    const expediente = await getExpedienteSummaryForProspecto(asesorId, prospectoId);
    return NextResponse.json({ expediente });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar expediente." },
      { status: 400 },
    );
  }
}
