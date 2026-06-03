import { NextResponse } from "next/server";
import {
  getProspectosResumenForAsesor,
  listProspectosForAsesor,
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
