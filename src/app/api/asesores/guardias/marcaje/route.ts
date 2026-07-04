import { NextResponse } from "next/server";
import { registerGuardiaMarcaje } from "@/lib/asesores/guardias-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      asesorId?: string;
      desarrolloId?: string;
      turno?: string;
      tipo?: string;
      lat?: number;
      lng?: number;
      accuracyMetros?: number | null;
    };

    const desarrolloId = body.desarrolloId?.trim();
    const turno = body.turno?.trim();
    const tipo = body.tipo?.trim();

    if (!desarrolloId || !turno || !tipo) {
      return NextResponse.json(
        { error: "desarrolloId, turno y tipo son requeridos." },
        { status: 400 },
      );
    }

    if (body.lat == null || body.lng == null) {
      return NextResponse.json({ error: "Ubicación GPS requerida." }, { status: 400 });
    }

    const asesorId = resolveAsesorIdForApi(body.asesorId);
    const marcaje = await registerGuardiaMarcaje({
      asesorId,
      desarrolloId,
      turno,
      tipo,
      lat: body.lat,
      lng: body.lng,
      accuracyMetros: body.accuracyMetros,
    });

    return NextResponse.json({ marcaje, ok: true });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo registrar el marcaje." },
      { status: 400 },
    );
  }
}
