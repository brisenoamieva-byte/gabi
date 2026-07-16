import { NextResponse } from "next/server";
import {
  getProspectoForAsesor,
  updateProspectoForAsesor,
  type AsesorUpdateProspectoInput,
} from "@/lib/asesores/prospectos-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";
import { getProspectoPlaybookState } from "@/lib/comercial/crm-playbook-service";
import { getCadenciaSummaryForProspecto } from "@/lib/comercial/cadencia-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { searchParams } = new URL(request.url);
  const { id } = await context.params;

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    const prospecto = await getProspectoForAsesor(asesorId, id);
    const [playbook, cadencia] = await Promise.all([
      getProspectoPlaybookState(prospecto),
      getCadenciaSummaryForProspecto(id),
    ]);
    return NextResponse.json({ prospecto, playbook, cadencia });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar prospecto." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as AsesorUpdateProspectoInput & {
      asesorId?: string;
      assignedAsesorId?: string | null;
    };
    const asesorId = resolveAsesorIdForApi(body.asesorId);

    const prospecto = await updateProspectoForAsesor(asesorId, id, {
      etapa: body.etapa,
      notas: body.notas,
      assignedAsesorId: body.assignedAsesorId,
      motivoDescarte: body.motivoDescarte,
      motivoDescarteDetalle: body.motivoDescarteDetalle,
    });

    const playbook = await getProspectoPlaybookState(prospecto);

    return NextResponse.json({ prospecto, playbook });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar prospecto." },
      { status: 400 },
    );
  }
}
