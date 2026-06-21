import { NextResponse } from "next/server";
import { getAsesorComplianceSummary } from "@/lib/comercial/crm-compliance-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    const summary = await getAsesorComplianceSummary(asesorId, desarrolloId);
    return NextResponse.json({ summary });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar cumplimiento." },
      { status: 400 },
    );
  }
}
