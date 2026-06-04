import { NextResponse } from "next/server";
import { getPlatformHealth } from "@/lib/admin/platform-health-service";
import { canAccessModule, isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile) && !canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const health = await getPlatformHealth();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al revisar plataforma" },
      { status: 500 },
    );
  }
}
