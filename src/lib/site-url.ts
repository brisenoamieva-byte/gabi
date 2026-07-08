const DEFAULT_PRODUCTION_SITE_URL = "https://www.gabi.mx";

const isLocalhostUrl = (url: string): boolean =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url.trim());

/** URL pública del sitio para emails, invites y redirects de auth. */
export const resolveSiteUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

  if (process.env.VERCEL) {
    if (configured && !isLocalhostUrl(configured)) {
      return configured;
    }

    const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (productionHost) {
      return `https://${productionHost.replace(/^https?:\/\//, "")}`;
    }

    const vercelUrl = process.env.VERCEL_URL?.trim();
    if (vercelUrl) {
      return `https://${vercelUrl}`;
    }

    return DEFAULT_PRODUCTION_SITE_URL;
  }

  if (configured) {
    return configured;
  }

  return "http://localhost:3000";
};
