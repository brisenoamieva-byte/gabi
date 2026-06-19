const readSecret = () => process.env.QA_WEBHOOK_SECRET?.trim() || null;

export const assertQaWebhookAuth = (request: Request, url: URL) => {
  const secret = readSecret();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("QA_WEBHOOK_SECRET no configurado.");
    }
    return;
  }

  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const headerSecret = request.headers.get("x-qa-secret")?.trim();
  const querySecret = url.searchParams.get("secret")?.trim();

  if (bearer === secret || headerSecret === secret || querySecret === secret) {
    return;
  }

  throw new Error("Webhook no autorizado.");
};

export const buildQaWebhookUrl = (baseUrl?: string) => {
  const origin =
    baseUrl?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "";
  const path = "/api/webhooks/qa";
  return origin ? `${origin}${path}` : path;
};
