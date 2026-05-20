import { NextResponse } from "next/server";
import { authenticateAsesorByPin } from "@/lib/asesores/auth";
import { getDesarrolloIdsForComercializador } from "@/lib/asesores/comercializadora";
import { isValidPin } from "@/lib/asesores/pin-server";
import { checkRateLimit, getRequestClientKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rate = checkRateLimit(getRequestClientKey(request, "asesor-pin"), 12, 60_000);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  try {
    const body = (await request.json()) as { pin?: string; portal?: string };
    const pin = body.pin?.trim() ?? "";

    if (!isValidPin(pin)) {
      return NextResponse.json({ error: "PIN inválido." }, { status: 400 });
    }

    const portal = body.portal?.trim().toLowerCase() ?? "bbr";
    const desarrolloIds = getDesarrolloIdsForComercializador(portal);

    const result = await authenticateAsesorByPin(pin, { desarrolloIds });
    if (!result) {
      return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
    }

    return NextResponse.json({ asesor: result.asesor, source: result.source });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error de autenticación" },
      { status: 500 },
    );
  }
}
