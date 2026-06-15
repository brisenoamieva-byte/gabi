import { NextResponse } from "next/server";
import { verifyGabiOwnerAccess } from "@/lib/gabi/master-auth";
import { buildOperatorSession } from "@/lib/gabi/operator-access";
import {
  GABI_MASTER_COOKIE,
  masterSessionCookieOptions,
  signMasterSession,
} from "@/lib/gabi/master-session";
import { checkRateLimit, getRequestClientKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rate = checkRateLimit(getRequestClientKey(request, "gabi-master-login"), 30, 60_000);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Correo y contraseña requeridos." }, { status: 400 });
    }

    if (!verifyGabiOwnerAccess(email, password)) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    const asesor = buildOperatorSession(email);
    const response = NextResponse.json({ ok: true, asesor });
    response.cookies.set(GABI_MASTER_COOKIE, signMasterSession(email), masterSessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error de autenticación" },
      { status: 500 },
    );
  }
}
