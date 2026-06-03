import { NextResponse } from "next/server";
import { createCampana, listCampanas, type CampanaInput } from "@/lib/admin/campanas-service";
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
  const activoOnly = searchParams.get("activoOnly") === "1";

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const campanas = await listCampanas({ desarrolloId, activoOnly }, session.profile);
    return NextResponse.json({ campanas });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar campañas." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as CampanaInput;

    if (!body.desarrolloId || !body.nombre?.trim()) {
      return NextResponse.json({ error: "Completa desarrollo y nombre." }, { status: 400 });
    }

    if (!canAccessDesarrollo(session.profile, body.desarrolloId)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const campana = await createCampana(body, session.profile);
    return NextResponse.json({ campana }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear campaña." },
      { status: 400 },
    );
  }
}
