import { NextResponse } from "next/server";
import { listPartners } from "@/lib/admin/partners-service";
import { assertAsesorDesarrollo } from "@/lib/asesores/prospectos-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

/** Catálogo de aliados (inmobiliarias / externos) de la comercializadora del desarrollo. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    await assertAsesorDesarrollo(asesorId, desarrolloId);

    const partners = await listPartners({ desarrolloId, activoOnly: true });
    return NextResponse.json({
      partners: partners.map((row) => ({
        id: row.id,
        nombre: row.nombre,
        tipo: row.tipo,
      })),
    });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar aliados." },
      { status: 400 },
    );
  }
}
