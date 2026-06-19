import { NextResponse } from "next/server";
import { getDesarrolloOnboarding } from "@/lib/admin/desarrollo-onboarding-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId");

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  if (!canAccessDesarrollo(session.profile, desarrolloId)) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  try {
    const onboarding = await getDesarrolloOnboarding(desarrolloId, session.profile);
    return NextResponse.json({ onboarding });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al consultar onboarding." },
      { status: 500 },
    );
  }
}
