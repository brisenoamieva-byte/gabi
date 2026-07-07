import { NextResponse } from "next/server";
import { listEquipoComercialForLeadership } from "@/lib/asesores/leadership-access";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    const asesores = await listEquipoComercialForLeadership(asesorId, desarrolloId);
    return NextResponse.json({
      asesores: asesores.map((row) => ({
        id: row.id,
        nombre: row.nombre,
        rol: row.rol,
      })),
    });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar equipo." },
      { status: 400 },
    );
  }
}
