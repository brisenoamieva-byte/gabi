import { NextResponse } from "next/server";
import {
  getProspectoForAsesor,
  updateProspectoForAsesor,
  type AsesorUpdateProspectoInput,
} from "@/lib/asesores/prospectos-service";

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
    return NextResponse.json({ prospecto });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar prospecto." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as AsesorUpdateProspectoInput & { asesorId?: string };
    const asesorId = body.asesorId?.trim();

    if (!asesorId) {
      return NextResponse.json({ error: "asesorId requerido." }, { status: 400 });
    }

    const prospecto = await updateProspectoForAsesor(asesorId, id, {
      etapa: body.etapa,
      notas: body.notas,
    });

    return NextResponse.json({ prospecto });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar prospecto." },
      { status: 400 },
    );
  }
}
