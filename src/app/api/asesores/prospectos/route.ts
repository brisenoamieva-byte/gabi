import { NextResponse } from "next/server";
import {
  createProspectoForAsesor,
  getProspectosResumenForAsesor,
  listProspectosForAsesor,
  type AsesorCreateProspectoInput,
} from "@/lib/asesores/prospectos-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asesorId = searchParams.get("asesorId")?.trim();
  const desarrolloId = searchParams.get("desarrolloId")?.trim();
  const etapa = searchParams.get("etapa") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const desde = searchParams.get("desde") ?? undefined;
  const hasta = searchParams.get("hasta") ?? undefined;
  const withResumen = searchParams.get("resumen") === "1";

  if (!asesorId || !desarrolloId) {
    return NextResponse.json({ error: "asesorId y desarrolloId requeridos." }, { status: 400 });
  }

  try {
    const [prospectos, resumen] = await Promise.all([
      listProspectosForAsesor(asesorId, { desarrolloId, etapa, search, desde, hasta }),
      withResumen
        ? getProspectosResumenForAsesor(asesorId, desarrolloId, { search, desde, hasta })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({ prospectos, resumen });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar prospectos." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AsesorCreateProspectoInput & { asesorId?: string };
    const asesorId = body.asesorId?.trim();

    if (!asesorId || !body.desarrolloId?.trim() || !body.nombre?.trim()) {
      return NextResponse.json(
        { error: "Completa asesor, desarrollo y nombre." },
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear prospecto." },
      { status: 400 },
    );
  }
}
