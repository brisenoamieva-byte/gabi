import { NextResponse } from "next/server";
import {
  buildOperatorSession,
  verifyOperatorAccessCode,
} from "@/lib/gabi/operator-access";
import { isGabiOperator } from "@/lib/gabi/operator";
import { checkRateLimit, getRequestClientKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rate = checkRateLimit(getRequestClientKey(request, "gabi-operator"), 8, 60_000);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  try {
    const body = (await request.json()) as { email?: string; codigo?: string };
    const email = body.email?.trim() ?? "";
    const codigo = body.codigo?.trim() ?? "";

    if (!email || !codigo) {
      return NextResponse.json({ error: "Correo y código requeridos." }, { status: 400 });
    }

    if (!isGabiOperator({ email })) {
      return NextResponse.json({ error: "Correo no autorizado." }, { status: 403 });
    }

    if (!verifyOperatorAccessCode(codigo)) {
      return NextResponse.json({ error: "Código incorrecto." }, { status: 401 });
    }

    return NextResponse.json({ ok: true, asesor: buildOperatorSession(email) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error de autenticación" },
      { status: 500 },
    );
  }
}
