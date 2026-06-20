import { NextResponse } from "next/server";
import { assertAsesorIdMatchesSession } from "@/lib/asesores/session-server";

export const asesorSessionErrorResponse = (error: unknown): NextResponse | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message === "ASESOR_SESSION_REQUIRED") {
    return NextResponse.json(
      { error: "Sesión de asesor requerida. Vuelve a ingresar tu PIN." },
      { status: 401 },
    );
  }

  if (error.message === "ASESOR_SESSION_MISMATCH") {
    return NextResponse.json({ error: "Sesión de asesor inválida." }, { status: 403 });
  }

  return null;
};

export const resolveAsesorIdForApi = (claimedAsesorId?: string | null): string =>
  assertAsesorIdMatchesSession(claimedAsesorId);
