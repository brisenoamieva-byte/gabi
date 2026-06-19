import { NextResponse } from "next/server";
import { ingestProspectoEncuesta, type EncuestaCanal, type EncuestaTipo } from "@/lib/admin/qa-satisfaccion-service";
import { assertQaWebhookAuth } from "@/lib/comercial/qa-webhook-auth";

type QaWebhookBody = {
  prospectoId?: string;
  xperienceId?: number;
  desarrolloId?: string;
  tipo?: EncuestaTipo;
  canal?: EncuestaCanal;
  score?: number;
  comentario?: string;
  externalId?: string;
  respondedAt?: string;
  source?: "adryo" | "webhook" | "manual" | "xperience";
};

export async function POST(request: Request) {
  const url = new URL(request.url);

  try {
    assertQaWebhookAuth(request, url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autorizado" },
      { status: 401 },
    );
  }

  let body: QaWebhookBody;
  try {
    body = (await request.json()) as QaWebhookBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const tipo = body.tipo;
  const score = body.score;

  if (tipo !== "qa" && tipo !== "satisfaccion") {
    return NextResponse.json({ error: "tipo debe ser qa o satisfaccion." }, { status: 422 });
  }

  if (typeof score !== "number" || Number.isNaN(score)) {
    return NextResponse.json({ error: "score numérico requerido (0-10)." }, { status: 422 });
  }

  try {
    const result = await ingestProspectoEncuesta({
      prospectoId: body.prospectoId,
      xperienceId: body.xperienceId,
      desarrolloId: body.desarrolloId,
      tipo,
      canal: body.canal,
      score,
      comentario: body.comentario,
      externalId: body.externalId,
      respondedAt: body.respondedAt,
      source: body.source ?? "webhook",
    });

    const statusCode =
      result.status === "created" ? 201 : result.status === "duplicate" ? 200 : 422;

    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Error interno.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Webhook QA / Satisfacción GABI. Usa POST con JSON.",
    hint: "Authorization: Bearer <QA_WEBHOOK_SECRET>",
    example: {
      xperienceId: 12345,
      tipo: "qa",
      canal: "whatsapp",
      score: 8.5,
      comentario: "Atención rápida",
      externalId: "adryo-msg-uuid",
    },
  });
}
