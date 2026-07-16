import { NextResponse } from "next/server";
import { listCadenciaHoyForAsesor } from "@/lib/comercial/cadencia-service";
import { listProximosContactosDueForAsesor } from "@/lib/comercial/proximo-contacto";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    const [items, proximosContactos] = await Promise.all([
      listCadenciaHoyForAsesor(asesorId, desarrolloId),
      listProximosContactosDueForAsesor(asesorId, desarrolloId),
    ]);
    return NextResponse.json({
      items,
      count: items.length,
      proximosContactos,
      proximosContactosCount: proximosContactos.length,
    });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar cadencia." },
      { status: 400 },
    );
  }
}
