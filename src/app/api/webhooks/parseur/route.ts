import { NextResponse } from "next/server";
import { ingestParseurLead } from "@/lib/admin/parseur-ingest-service";
import { assertParseurWebhookAuth } from "@/lib/comercial/parseur-webhook-auth";

export async function POST(request: Request) {
  const url = new URL(request.url);

  try {
    assertParseurWebhookAuth(request, url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autorizado" },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const campanaId = url.searchParams.get("campanaId") ?? undefined;

  try {
    const result = await ingestParseurLead({ payload, campanaId });

    const statusCode =
      result.status === "created" || result.status === "updated"
        ? 201
        : result.status === "duplicate"
          ? 200
          : result.status === "ignored"
            ? 200
            : result.status === "rejected"
              ? 422
              : 500;

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
    message: "Webhook Parseur GABI. Usa POST con JSON de campos extraídos.",
    hint: "Añade ?campanaId=<uuid> y Authorization: Bearer <PARSEUR_WEBHOOK_SECRET>",
  });
}
