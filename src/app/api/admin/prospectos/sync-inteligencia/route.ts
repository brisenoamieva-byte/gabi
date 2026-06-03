import { NextResponse } from "next/server";
import { syncLeadIntelligenceForDesarrollo } from "@/lib/admin/prospectos-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { desarrolloId?: string };
    if (!body.desarrolloId) {
      return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
    }

    if (!canAccessDesarrollo(session.profile, body.desarrolloId)) {
      return NextResponse.json({ error: "Sin permiso para este desarrollo." }, { status: 403 });
    }

    const result = await syncLeadIntelligenceForDesarrollo(body.desarrolloId, session.profile);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al sincronizar." },
      { status: 500 },
    );
  }
}
