import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ingestMetaLeadgen } from "@/lib/comercial/meta-lead-ingest";
import { getMetaAppSecret, getMetaWebhookVerifyToken } from "@/lib/whatsapp/config";

const verifyMetaSignature = (rawBody: string, signatureHeader: string | null): boolean => {
  const secret = getMetaAppSecret();
  if (!secret || !signatureHeader?.startsWith("sha256=")) {
    return !secret;
  }

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const received = signatureHeader.slice("sha256=".length);

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
  } catch {
    return false;
  }
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = getMetaWebhookVerifyToken();

  if (mode === "subscribe" && token && verifyToken && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verificación fallida." }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (getMetaAppSecret() && !verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const entry = (payload as { entry?: Array<{ changes?: Array<{ field?: string; value?: Record<string, string> }> }> })
    .entry;

  const results: unknown[] = [];

  for (const item of entry ?? []) {
    for (const change of item.changes ?? []) {
      if (change.field !== "leadgen") {
        continue;
      }

      const leadgenId = change.value?.leadgen_id;
      const formId = change.value?.form_id;

      if (!leadgenId) {
        continue;
      }

      try {
        const result = await ingestMetaLeadgen(leadgenId, formId);
        results.push({ leadgenId, ...result });
      } catch (error) {
        results.push({
          leadgenId,
          status: "error",
          message: error instanceof Error ? error.message : "Error",
        });
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
