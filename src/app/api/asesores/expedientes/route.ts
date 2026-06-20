import { NextResponse } from "next/server";
import { getExpedienteSummaryForProspecto } from "@/lib/asesores/expediente-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asesorId = searchParams.get("asesorId")?.trim();
  const prospectoId = searchParams.get("prospectoId")?.trim();

  if (!asesorId || !prospectoId) {
    return NextResponse.json({ error: "asesorId y prospectoId requeridos." }, { status: 400 });
  }

  try {
    const expediente = await getExpedienteSummaryForProspecto(asesorId, prospectoId);
    return NextResponse.json({ expediente });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar expediente." },
      { status: 400 },
    );
  }
}
