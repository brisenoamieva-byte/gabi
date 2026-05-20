import { NextResponse } from "next/server";
import { sendPostVisitaFollowUpEmail } from "@/lib/email/send-post-visita";
import { validateAsesorForVisita } from "@/lib/visitas/service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      desarrolloId?: string;
      asesorId?: string;
      asesorNombre?: string;
      clienteNombre?: string;
      clienteEmail?: string;
      desarrolloNombre?: string;
      clusterNombre?: string;
      prototipoNombre?: string;
      precioFinal?: number;
    };

    if (!body.desarrolloId?.trim() || !body.asesorId?.trim() || !body.clienteEmail?.trim()) {
      return NextResponse.json(
        { error: "Completa desarrollo, asesor y email del cliente." },
        { status: 400 },
      );
    }

    const validation = await validateAsesorForVisita(body.asesorId, body.desarrolloId);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.reason }, { status: 403 });
    }

    const result = await sendPostVisitaFollowUpEmail({
      desarrolloNombre: body.desarrolloNombre?.trim() || "Desarrollo",
      asesorNombre: body.asesorNombre?.trim() || validation.nombre,
      clienteNombre: body.clienteNombre?.trim() || "Prospecto",
      clienteEmail: body.clienteEmail.trim(),
      clusterNombre: body.clusterNombre,
      prototipoNombre: body.prototipoNombre,
      precioFinal: body.precioFinal,
    });

    if (!result.sent) {
      const status =
        result.reason === "not_configured"
          ? 503
          : result.reason === "invalid_email"
            ? 400
            : 502;

      return NextResponse.json(
        {
          sent: false,
          reason: result.reason,
          detail: result.detail,
          error:
            result.reason === "not_configured"
              ? "Email no configurado en el servidor (RESEND_API_KEY)."
              : result.detail ?? "No se pudo enviar el correo.",
        },
        { status },
      );
    }

    return NextResponse.json({ sent: true, id: result.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al enviar email." },
      { status: 500 },
    );
  }
}
