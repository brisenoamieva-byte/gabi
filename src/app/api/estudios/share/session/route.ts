import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNuboPresentacionMarca } from "@/lib/estudios/nubo-publicidad-store";
import { getEstudioShareByToken } from "@/lib/estudios/share-service";
import { getEstudioShareCookieName, verifyEstudioShareSession } from "@/lib/estudios/share-session";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim() ?? "";

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 400 });
    }

    const share = await getEstudioShareByToken(token);
    if (!share) {
      return NextResponse.json({ authenticated: false, error: "Enlace no válido." }, { status: 404 });
    }

    const cookieStore = cookies();
    const session = cookieStore.get(getEstudioShareCookieName(token))?.value;
    const authenticated = verifyEstudioShareSession(token, session);

    const presentacionMarca = await getNuboPresentacionMarca();

    if (!authenticated) {
      return NextResponse.json({
        authenticated: false,
        tituloCliente: share.titulo_cliente,
        estudioSlug: share.estudio_slug,
        presentacionMarca,
      });
    }

    return NextResponse.json({
      authenticated: true,
      estudioSlug: share.estudio_slug,
      tituloCliente: share.titulo_cliente,
      presentacionMarca,
    });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, error: error instanceof Error ? error.message : "Error" },
      { status: 500 },
    );
  }
}
