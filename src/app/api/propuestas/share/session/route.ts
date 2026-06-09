import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getShareByToken } from "@/lib/propuestas/share-service";
import { getShareCookieName, verifyShareSession } from "@/lib/propuestas/share-session";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim() ?? "";

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 400 });
    }

    const share = await getShareByToken(token);
    if (!share) {
      return NextResponse.json({ authenticated: false, error: "Enlace no válido." }, { status: 404 });
    }

    const cookieStore = cookies();
    const session = cookieStore.get(getShareCookieName(token))?.value;
    const authenticated = verifyShareSession(token, session);

    if (!authenticated) {
      return NextResponse.json({
        authenticated: false,
        tituloCliente: share.titulo_cliente,
        propuestaSlug: share.propuesta_slug,
      });
    }

    return NextResponse.json({
      authenticated: true,
      propuestaSlug: share.propuesta_slug,
      tituloCliente: share.titulo_cliente,
    });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, error: error instanceof Error ? error.message : "Error" },
      { status: 500 },
    );
  }
}
