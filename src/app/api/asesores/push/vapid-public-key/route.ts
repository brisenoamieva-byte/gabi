import { NextResponse } from "next/server";
import { getVapidPublicKey, isWebPushConfigured } from "@/lib/push/web-push";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function GET() {
  try {
    resolveAsesorIdForApi(null);
    const publicKey = getVapidPublicKey();
    if (!isWebPushConfigured() || !publicKey) {
      return NextResponse.json(
        { configured: false, error: "Web Push no configurado en el servidor." },
        { status: 503 },
      );
    }
    return NextResponse.json({ configured: true, publicKey });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al leer VAPID." },
      { status: 400 },
    );
  }
}
