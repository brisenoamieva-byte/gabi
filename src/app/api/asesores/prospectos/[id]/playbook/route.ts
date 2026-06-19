import { NextResponse } from "next/server";
import {
  completePlaybookStepForProspecto,
  getProspectoPlaybookState,
} from "@/lib/comercial/crm-playbook-service";
import { getProspectoForAsesor } from "@/lib/asesores/prospectos-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { searchParams } = new URL(request.url);
  const asesorId = searchParams.get("asesorId")?.trim();
  const { id } = await context.params;

  if (!asesorId) {
    return NextResponse.json({ error: "asesorId requerido." }, { status: 400 });
  }

  try {
    const prospecto = await getProspectoForAsesor(asesorId, id);
    const playbook = await getProspectoPlaybookState(prospecto);
    return NextResponse.json({ playbook });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar playbook." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as { asesorId?: string; stepId?: string };
    const asesorId = body.asesorId?.trim();
    const stepId = body.stepId?.trim();

    if (!asesorId || !stepId) {
      return NextResponse.json({ error: "asesorId y stepId requeridos." }, { status: 400 });
    }

    const playbook = await completePlaybookStepForProspecto(asesorId, id, stepId);
    return NextResponse.json({ playbook });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al completar paso." },
      { status: 400 },
    );
  }
}
