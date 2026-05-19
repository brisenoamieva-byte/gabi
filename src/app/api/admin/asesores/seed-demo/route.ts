import { NextResponse } from "next/server";
import { canAccessModule } from "@/lib/admin/permissions";
import { seedDemoAsesores } from "@/lib/admin/asesores-service";
import { getAdminSession } from "@/lib/admin/session";

export async function POST() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "asesores")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const result = await seedDemoAsesores(session.profile);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al importar demo" },
      { status: 500 },
    );
  }
}
