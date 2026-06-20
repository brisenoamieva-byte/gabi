import { NextResponse } from "next/server";
import { getAsesorSessionById } from "@/lib/asesores/auth";
import { asesorSessionErrorResponse } from "@/lib/asesores/session-api";
import { requireAsesorIdFromSession } from "@/lib/asesores/session-server";

export async function GET() {
  try {
    const asesorId = requireAsesorIdFromSession();
    const asesor = await getAsesorSessionById(asesorId);
    if (!asesor) {
      return NextResponse.json({ error: "Asesor no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ asesor });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar sesión." },
      { status: 500 },
    );
  }
}
