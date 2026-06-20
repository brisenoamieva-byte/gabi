import { NextResponse } from "next/server";
import {
  applySqlMigrations,
  getAutoApplyableMigrationIds,
} from "@/lib/admin/apply-sql-migrations";
import { getPlatformHealth } from "@/lib/admin/platform-health-service";
import { canApplySupabaseMigrations } from "@/lib/admin/resolve-supabase-db-url";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const health = await getPlatformHealth();
  const pendingIds = health.checks
    .filter((item) => !item.ok)
    .map((item) => item.id)
    .filter((id) => getAutoApplyableMigrationIds().includes(id));

  return NextResponse.json({
    canApply: canApplySupabaseMigrations() && pendingIds.length > 0,
    pendingIds,
    autoApplyableIds: getAutoApplyableMigrationIds(),
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  if (!canApplySupabaseMigrations()) {
    return NextResponse.json(
      {
        error:
          "Sin SUPABASE_DB_URL ni SUPABASE_DB_PASSWORD en el servidor. Añádelo en Vercel y redeploy, o pega el SQL manualmente.",
      },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { migrationIds?: string[] };
    const health = await getPlatformHealth();
    const pendingFromHealth = health.checks
      .filter((item) => !item.ok)
      .map((item) => item.id)
      .filter((id) => getAutoApplyableMigrationIds().includes(id));

    const migrationIds =
      body.migrationIds?.length
        ? body.migrationIds.filter((id) => getAutoApplyableMigrationIds().includes(id))
        : pendingFromHealth;

    if (!migrationIds.length) {
      return NextResponse.json({ error: "No hay migraciones pendientes para auto-aplicar." }, { status: 400 });
    }

    const applied = await applySqlMigrations(migrationIds);
    const healthAfter = await getPlatformHealth();

    return NextResponse.json({
      ok: true,
      applied,
      health: healthAfter,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al aplicar migraciones." },
      { status: 500 },
    );
  }
}
