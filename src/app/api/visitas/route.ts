import { NextResponse } from "next/server";
import { insertVisita } from "@/lib/visitas/service";
import type { VisitaInput } from "@/lib/visitas/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VisitaInput;

    if (!body.tipo || !body.desarrolloId || !body.asesorId) {
      return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
    }

    if (body.tipo !== "lead_registrado" && body.tipo !== "recorrido_completado") {
      return NextResponse.json({ error: "Tipo de visita inválido." }, { status: 400 });
    }

    const record = await insertVisita(body);
    if (!record) {
      return NextResponse.json(
        { error: "No se pudo registrar la visita (servidor)." },
        { status: 503 },
      );
    }

    return NextResponse.json({ visita: record });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al registrar visita." },
      { status: 400 },
    );
  }
}
