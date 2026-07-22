import { NextResponse } from "next/server";
import { getDesarrolloIdsForComercializadora } from "@/lib/catalog/service";
import { authenticateAsesorByPin, authenticateInvesttiSimuladorByPin } from "@/lib/asesores/auth";
import { isValidPin } from "@/lib/asesores/pin-server";
import {
  asesorSessionCookieOptions,
  signAsesorSession,
  ASESOR_SESSION_COOKIE,
} from "@/lib/asesores/session-cookie";
import { isInvesttiSimuladorPortal } from "@/lib/portal/investti-simulador";
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

    if (isInvesttiSimuladorPortal(portal)) {
      const investtiResult = await authenticateInvesttiSimuladorByPin(pin);
      if (!investtiResult) {
        return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
      }
      const response = NextResponse.json({
        asesor: investtiResult.asesor,
        source: investtiResult.source,
      });
      response.cookies.set(
        ASESOR_SESSION_COOKIE,
        signAsesorSession(investtiResult.asesor.id),
        asesorSessionCookieOptions(),
      );
      return response;
    }

    const desarrolloIds = await getDesarrolloIdsForComercializadora(portal);
    if (!desarrolloIds.length) {
      return NextResponse.json(
        { error: "Este portal no tiene desarrollos activos." },
        { status: 403 },
      );
    }

    const result = await authenticateAsesorByPin(pin, { desarrolloIds });
    if (!result) {
      return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
    }

    if (!result.asesor.desarrollosIds.length) {
      return NextResponse.json(
        { error: "Tu PIN no tiene acceso a los desarrollos de este portal." },
        { status: 403 },
      );
    }

    const response = NextResponse.json({ asesor: result.asesor, source: result.source });
    response.cookies.set(
      ASESOR_SESSION_COOKIE,
      signAsesorSession(result.asesor.id),
      asesorSessionCookieOptions(),
    );
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error de autenticación" },
      { status: 500 },
    );
  }
}
