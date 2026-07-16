import { NextResponse } from "next/server";
import {
  createPartner,
  listPartners,
  type PartnerInput,
} from "@/lib/admin/partners-service";
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
  const desarrolloId = searchParams.get("desarrolloId") ?? undefined;
  const comercializadoraId = searchParams.get("comercializadoraId") ?? undefined;
  const activoOnly = searchParams.get("activoOnly") === "1";

  if (!desarrolloId && !comercializadoraId) {
    return NextResponse.json(
      { error: "desarrolloId o comercializadoraId requerido." },
      { status: 400 },
    );
  }

  try {
    const partners = await listPartners(
      { desarrolloId, comercializadoraId, activoOnly },
      session.profile,
    );
    return NextResponse.json({ partners });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar aliados." },
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
    const body = (await request.json()) as PartnerInput;

    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: "Completa el nombre del aliado." }, { status: 400 });
    }

    if (body.desarrolloId && !canAccessDesarrollo(session.profile, body.desarrolloId)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const partner = await createPartner(body, session.profile);
    return NextResponse.json({ partner }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear aliado." },
      { status: 400 },
    );
  }
}
