import { NextResponse } from "next/server";
import { sendPostVisitaEmailFromVisita } from "@/lib/email/send-post-visita";
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

    const result = await insertVisita(body);
    if (!result) {
      return NextResponse.json(
        { error: "No se pudo registrar la visita (servidor)." },
        { status: 503 },
      );
    }

    let emailResult = null;
    if (body.tipo === "recorrido_completado" && body.clienteEmail?.trim()) {
      emailResult = await sendPostVisitaEmailFromVisita(body);
    }

    return NextResponse.json({
      visita: result.visita,
      prospectoId: result.prospectoId,
      emailSent: emailResult?.sent ?? false,
      emailReason: emailResult && !emailResult.sent ? emailResult.reason : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al registrar visita." },
      { status: 400 },
    );
  }
}
