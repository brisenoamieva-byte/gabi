import { NextResponse } from "next/server";
import { getGuardiaHoyForAsesor } from "@/lib/asesores/guardias-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asesorId = searchParams.get("asesorId")?.trim();
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!asesorId || !desarrolloId) {
    return NextResponse.json({ error: "asesorId y desarrolloId requeridos." }, { status: 400 });
  }

  try {
    const guardia = await getGuardiaHoyForAsesor(asesorId, desarrolloId);
    return NextResponse.json({ guardia });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar guardia." },
      { status: 400 },
    );
  }
}
