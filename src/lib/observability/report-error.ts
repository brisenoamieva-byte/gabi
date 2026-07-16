type ReportContext = Record<string, unknown>;

const getDsn = () =>
  process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || "";

/**
 * Reporta errores a Sentry si hay DSN. Sin DSN, solo loguea (no rompe la app).
 * Actívalo poniendo SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN en Vercel.
 */
export async function reportError(error: unknown, context?: ReportContext): Promise<void> {
  const dsn = getDsn();
  if (!dsn) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[observability]", error, context);
    }
    return;
  }

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context);
      }
      Sentry.captureException(error);
    });
  } catch (loadError) {
    console.error("[observability] Sentry no disponible", loadError);
    console.error(error);
  }
}

export function isSentryConfigured(): boolean {
  return Boolean(getDsn());
}
