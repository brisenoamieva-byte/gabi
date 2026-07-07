import { NextResponse } from "next/server";
import { checkProspectoTelefonoForAsesor } from "@/lib/asesores/prospectos-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();
  const telefono = searchParams.get("telefono")?.trim();

  if (!desarrolloId || !telefono) {
    return NextResponse.json({ error: "desarrolloId y telefono requeridos." }, { status: 400 });
  }

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    const result = await checkProspectoTelefonoForAsesor(asesorId, desarrolloId, telefono);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al validar teléfono." },
      { status: 400 },
    );
  }
}
