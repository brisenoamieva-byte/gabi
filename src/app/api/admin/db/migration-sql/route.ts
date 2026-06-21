import { NextResponse } from "next/server";
import { readMigrationSql } from "@/lib/admin/apply-sql-migrations";
import { isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  const bundle = searchParams.get("bundle")?.trim();

  if (bundle === "042-043") {
    const path = join(process.cwd(), "supabase/migrations/_bundle_042_043_apply_once.sql");
    const sql = readFileSync(path, "utf8");
    return NextResponse.json({
      id: "042-043",
      migrationFile: "_bundle_042_043_apply_once.sql",
      sql,
    });
  }

  if (!id) {
    return NextResponse.json({ error: "id o bundle requerido." }, { status: 400 });
  }

  const sql = readMigrationSql(id);
  if (!sql) {
    return NextResponse.json({ error: "Migración no encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    id,
    migrationFile: `${id}_*.sql`,
    sql,
  });
}
