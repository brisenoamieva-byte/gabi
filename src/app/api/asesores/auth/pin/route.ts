import { NextResponse } from "next/server";
import { authenticateAsesorByPin } from "@/lib/asesores/auth";
import { isValidPin } from "@/lib/asesores/pin-server";

const portalDesarrollos: Record<string, string[]> = {
  bbr: ["la-vista-residencial"],
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pin?: string; portal?: string };
    const pin = body.pin?.trim() ?? "";

    if (!isValidPin(pin)) {
      return NextResponse.json({ error: "PIN inválido." }, { status: 400 });
    }

    const portal = body.portal?.trim().toLowerCase() ?? "bbr";
    const desarrolloIds = portalDesarrollos[portal];

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
