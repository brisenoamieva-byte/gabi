import { NextResponse } from "next/server";
import { getPublishedInvesttiSimulador } from "@/lib/admin/investti-simulador-service";
import { getAdminSession } from "@/lib/admin/session";
import { canAccessModule, isSuperAdmin } from "@/lib/admin/permissions";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile) && !canAccessModule(session.profile, "catalogo")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const published = await getPublishedInvesttiSimulador();
    return NextResponse.json({
      meta: published.meta,
      config: published.config,
      reglas: published.config.reglas,
      desarrollos: Object.keys(published.config.reglas),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al leer configuración" },
      { status: 500 },
    );
  }
}
