import { NextResponse } from "next/server";
import { isValidShareCode } from "@/lib/propuestas/share-code";
import { authenticateShareCode } from "@/lib/propuestas/share-service";
import {
  getShareCookieName,
  shareSessionCookieOptions,
  signShareSession,
} from "@/lib/propuestas/share-session";
import { checkRateLimit, getRequestClientKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rate = checkRateLimit(getRequestClientKey(request, "propuesta-share"), 10, 60_000);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  try {
    const body = (await request.json()) as { token?: string; codigo?: string };
    const token = body.token?.trim() ?? "";
    const codigo = body.codigo?.trim() ?? "";

    if (!token || !isValidShareCode(codigo)) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const share = await authenticateShareCode(token, codigo);
    if (!share) {
      return NextResponse.json({ error: "Enlace o código incorrecto." }, { status: 401 });
    }

    const response = NextResponse.json({
      ok: true,
      propuestaSlug: share.propuesta_slug,
      tituloCliente: share.titulo_cliente,
    });

    response.cookies.set(
      getShareCookieName(token),
      signShareSession(token),
      shareSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error de autenticación" },
      { status: 500 },
    );
  }
}
