/** URL del webhook Parseur para una campaña (uso en admin y documentación). */
export const buildParseurWebhookUrl = (campanaId: string, siteOrigin?: string) => {
  const base = (siteOrigin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const path = `/api/webhooks/parseur?campanaId=${encodeURIComponent(campanaId)}`;
  return base ? `${base}${path}` : path;
};
