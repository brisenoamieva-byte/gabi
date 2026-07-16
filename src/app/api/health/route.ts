import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthStatus = "ok" | "degraded" | "down";

/**
 * Liveness/readiness público para monitores externos (UptimeRobot, Better Stack, etc.).
 * No autentica y no expone secretos.
 */
export async function GET() {
  const started = Date.now();
  const checks: Record<string, { ok: boolean; detail?: string; ms?: number }> = {};

  const supabaseConfigured = isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  checks.env = {
    ok: supabaseConfigured,
    detail: supabaseConfigured ? "Vars base presentes" : "Faltan vars Supabase",
  };

  if (supabaseConfigured) {
    const probeStarted = Date.now();
    try {
      const supabase = createSupabaseServiceClient();
      if (!supabase) {
        checks.database = { ok: false, detail: "Cliente Supabase no disponible" };
      } else {
        const { error } = await supabase.from("desarrollos_catalog").select("id", { head: true, count: "exact" });
        checks.database = {
          ok: !error,
          detail: error ? "No responde catálogo" : "Supabase responde",
          ms: Date.now() - probeStarted,
        };
      }
    } catch {
      checks.database = {
        ok: false,
        detail: "Error al consultar Supabase",
        ms: Date.now() - probeStarted,
      };
    }
  } else {
    checks.database = { ok: false, detail: "Sin configuración" };
  }

  const cronConfigured = Boolean(process.env.CRON_SECRET?.trim());
  checks.cron = {
    ok: cronConfigured || process.env.NODE_ENV !== "production",
    detail: cronConfigured ? "CRON_SECRET presente" : "CRON_SECRET ausente",
  };

  const sessionConfigured = Boolean(process.env.ASESOR_SESSION_SECRET?.trim());
  checks.session = {
    ok: sessionConfigured || process.env.NODE_ENV !== "production",
    detail: sessionConfigured
      ? "ASESOR_SESSION_SECRET presente"
      : "ASESOR_SESSION_SECRET ausente (requerido en producción)",
  };

  const emailConfigured = Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim(),
  );
  checks.email = {
    ok: emailConfigured || process.env.NODE_ENV !== "production",
    detail: emailConfigured
      ? "Resend configurado"
      : "Falta RESEND_API_KEY o EMAIL_FROM (notificaciones)",
  };

  const metaLeadConfigured = Boolean(
    process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() &&
      process.env.META_APP_SECRET?.trim() &&
      process.env.META_PAGE_ACCESS_TOKEN?.trim(),
  );
  checks.metaLeads = {
    ok: true, // no tumba la plataforma; solo informa
    detail: metaLeadConfigured
      ? "Meta Lead Ads listo (verify + secret + page token)"
      : "Meta Lead Ads incompleto (faltan META_APP_SECRET y/o META_PAGE_ACCESS_TOKEN)",
  };

  const criticalOk = Boolean(checks.env?.ok && checks.database?.ok);
  const softOk = Boolean(checks.cron?.ok && checks.session?.ok && checks.email?.ok);
  const allOk = criticalOk && softOk;

  let status: HealthStatus = "ok";
  if (!criticalOk) {
    status = "down";
  } else if (!allOk) {
    status = "degraded";
  }

  const body = {
    status,
    service: "gabi",
    time: new Date().toISOString(),
    durationMs: Date.now() - started,
    checks,
  };

  return NextResponse.json(body, {
    status: status === "down" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
