import { NextResponse } from "next/server";
import { registerGuardiaSalida } from "@/lib/asesores/guardia-salida-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      asesorId?: string;
      desarrolloId?: string;
      turno?: string;
      lat?: number;
      lng?: number;
      accuracyMetros?: number | null;
      cuestionario?: unknown;
    };

    const desarrolloId = body.desarrolloId?.trim();
    const turno = body.turno?.trim();

    if (!desarrolloId || !turno) {
      return NextResponse.json(
        { error: "desarrolloId y turno son requeridos." },
        { status: 400 },
      );
    }

    if (body.lat == null || body.lng == null) {
      return NextResponse.json({ error: "Ubicación GPS requerida." }, { status: 400 });
    }

    const asesorId = resolveAsesorIdForApi(body.asesorId);
    const result = await registerGuardiaSalida({
      asesorId,
      desarrolloId,
      turno,
      lat: body.lat,
      lng: body.lng,
      accuracyMetros: body.accuracyMetros,
      cuestionario: body.cuestionario,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo registrar la salida." },
      { status: 400 },
    );
  }
}
