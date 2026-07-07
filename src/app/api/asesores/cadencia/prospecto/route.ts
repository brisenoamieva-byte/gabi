import { NextResponse } from "next/server";
import { listCadenciaHoyForAsesor } from "@/lib/comercial/cadencia-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prospectoId = searchParams.get("prospectoId")?.trim();
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!prospectoId) {
    return NextResponse.json({ error: "prospectoId requerido." }, { status: 400 });
  }

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));

    if (desarrolloId) {
      const all = await listCadenciaHoyForAsesor(asesorId, desarrolloId);
      return NextResponse.json({
        items: all.filter((item) => item.prospectoId === prospectoId),
      });
    }

    const { createSupabaseServiceClient } = await import("@/lib/supabase/server");
    const supabase = createSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ items: [] });
    }

    const { data: prospecto } = await supabase
      .from("prospectos")
      .select("desarrollo_id")
      .eq("id", prospectoId)
      .eq("asesor_id", asesorId)
      .maybeSingle();

    if (!prospecto?.desarrollo_id) {
      return NextResponse.json({ items: [] });
    }

    const all = await listCadenciaHoyForAsesor(asesorId, prospecto.desarrollo_id as string);
    return NextResponse.json({
      items: all.filter((item) => item.prospectoId === prospectoId),
    });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar cadencia." },
      { status: 400 },
    );
  }
}
