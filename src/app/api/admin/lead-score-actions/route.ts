import { NextResponse } from "next/server";
import { canAccessModule, canConfigureCrmPlaybook } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import {
  listLeadScoreActions,
  updateLeadScoreAction,
} from "@/lib/comercial/lead-activity-score-service";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "asesor" ? "asesor" : "lead";

  try {
    const actions = await listLeadScoreActions(scope);
    return NextResponse.json({ actions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar acciones." },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canConfigureCrmPlaybook(session.profile)) {
    return NextResponse.json({ error: "Sin permiso para configurar score." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      points?: number;
      enabled?: boolean;
      label?: string;
      hint?: string;
    };

    const id = body.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "id requerido." }, { status: 400 });
    }

    const action = await updateLeadScoreAction(
      id,
      {
        points: body.points,
        enabled: body.enabled,
        label: body.label,
        hint: body.hint,
      },
      session.profile.id,
    );

    return NextResponse.json({ action });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar acción." },
      { status: 400 },
    );
  }
}
