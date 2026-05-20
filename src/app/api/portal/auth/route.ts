import { NextResponse } from "next/server";
import { authenticateComercializador } from "@/lib/portal/auth-server";
import { checkRateLimit, getRequestClientKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rate = checkRateLimit(getRequestClientKey(request, "portal-auth"), 8, 60_000);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  try {
    const body = (await request.json()) as { usuario?: string; password?: string };
    const usuario = body.usuario?.trim() ?? "";
    const password = body.password ?? "";

    if (!usuario || !password) {
      return NextResponse.json({ error: "Usuario y contraseña requeridos." }, { status: 400 });
    }

    const match = authenticateComercializador(usuario, password);
    if (!match) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      portal: {
        id: match.id,
        nombre: match.nombre,
        slug: match.slug,
        logo: match.logo,
        portalPath: match.portalPath,
        colorPrimary: match.colorPrimary,
        colorAccent: match.colorAccent,
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo validar el acceso." }, { status: 500 });
  }
}
