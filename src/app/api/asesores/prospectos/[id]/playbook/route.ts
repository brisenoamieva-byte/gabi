import { NextResponse } from "next/server";
import {
  completePlaybookStepForProspecto,
  getProspectoPlaybookState,
} from "@/lib/comercial/crm-playbook-service";
import type { PerfilamientoVisitaAnswers } from "@/lib/comercial/perfilamiento-post-visita";
import { getProspectoForAsesor } from "@/lib/asesores/prospectos-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { searchParams } = new URL(request.url);
  const { id } = await context.params;

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    const prospecto = await getProspectoForAsesor(asesorId, id);
    const playbook = await getProspectoPlaybookState(prospecto);
    return NextResponse.json({ playbook });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar playbook." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      asesorId?: string;
      stepId?: string;
      stepDate?: string;
      stepTime?: string;
      perfilamientoVisita?: PerfilamientoVisitaAnswers;
    };
    const asesorId = resolveAsesorIdForApi(body.asesorId);
    const stepId = body.stepId?.trim();
    const stepDate = body.stepDate?.trim();
    const stepTime = body.stepTime?.trim();

    if (!stepId) {
      return NextResponse.json({ error: "stepId requerido." }, { status: 400 });
    }

    const { playbook, prospecto } = await completePlaybookStepForProspecto(
      asesorId,
      id,
      stepId,
      stepDate,
      body.perfilamientoVisita,
      stepTime,
    );
    return NextResponse.json({ playbook, prospecto });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al completar paso." },
      { status: 400 },
    );
  }
}
