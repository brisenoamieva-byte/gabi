const readSecret = () => process.env.PARSEUR_WEBHOOK_SECRET?.trim() || null;

export const assertParseurWebhookAuth = (request: Request, url: URL) => {
  const secret = readSecret();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PARSEUR_WEBHOOK_SECRET no configurado.");
    }
    return;
  }

  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const headerSecret = request.headers.get("x-parseur-secret")?.trim();
  const querySecret = url.searchParams.get("secret")?.trim();

  if (bearer === secret || headerSecret === secret || querySecret === secret) {
    return;
  }

  throw new Error("Webhook no autorizado.");
};
