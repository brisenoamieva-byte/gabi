import { NextResponse } from "next/server";
import {
  createProspectoForAsesor,
  getProspectosResumenForAsesor,
  listProspectosForAsesor,
  type AsesorCreateProspectoInput,
} from "@/lib/asesores/prospectos-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();
  const etapa = searchParams.get("etapa") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const desde = searchParams.get("desde") ?? undefined;
  const hasta = searchParams.get("hasta") ?? undefined;
  const withResumen = searchParams.get("resumen") === "1";

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    const [prospectos, resumen] = await Promise.all([
      listProspectosForAsesor(asesorId, { desarrolloId, etapa, search, desde, hasta }),
      withResumen
        ? getProspectosResumenForAsesor(asesorId, desarrolloId, { search, desde, hasta })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({ prospectos, resumen });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar prospectos." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AsesorCreateProspectoInput & { asesorId?: string };
    const asesorId = resolveAsesorIdForApi(body.asesorId);

    if (!body.desarrolloId?.trim() || !body.nombre?.trim()) {
      return NextResponse.json(
        { error: "Completa desarrollo y nombre." },
        { status: 400 },
      );
    }

    const prospecto = await createProspectoForAsesor(asesorId, {
      desarrolloId: body.desarrolloId.trim(),
      nombre: body.nombre.trim(),
      email: body.email,
      telefono: body.telefono,
      medioContacto: body.medioContacto,
      notas: body.notas,
    });

    return NextResponse.json({ prospecto }, { status: 201 });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear prospecto." },
      { status: 400 },
    );
  }
}
