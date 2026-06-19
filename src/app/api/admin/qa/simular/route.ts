import { NextResponse } from "next/server";
import {
  ingestProspectoEncuesta,
  isQaEncuestasAvailable,
  type EncuestaCanal,
  type EncuestaTipo,
} from "@/lib/admin/qa-satisfaccion-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "metricas")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const migrationOk = await isQaEncuestasAvailable();
  if (!migrationOk) {
    return NextResponse.json(
      {
        status: "rejected",
        message: "Aplica supabase/migrations/037_prospecto_qa_satisfaccion.sql en Supabase.",
      },
      { status: 422 },
    );
  }

  try {
    const body = (await request.json()) as {
      prospectoId?: string;
      xperienceId?: number;
      desarrolloId?: string;
      tipo?: EncuestaTipo;
      canal?: EncuestaCanal;
      score?: number;
      comentario?: string;
    };

    const tipo = body.tipo;
    if (tipo !== "qa" && tipo !== "satisfaccion") {
      return NextResponse.json({ error: "tipo debe ser qa o satisfaccion." }, { status: 400 });
    }

    if (typeof body.score !== "number" || Number.isNaN(body.score)) {
      return NextResponse.json({ error: "score numérico requerido (0-10)." }, { status: 400 });
    }

    if (!body.prospectoId?.trim() && !body.xperienceId) {
      return NextResponse.json(
        { error: "Selecciona un prospecto o indica xperienceId." },
        { status: 400 },
      );
    }

    const result = await ingestProspectoEncuesta({
      prospectoId: body.prospectoId?.trim(),
      xperienceId: body.xperienceId,
      desarrolloId: body.desarrolloId?.trim(),
      tipo,
      canal: body.canal,
      score: body.score,
      comentario: body.comentario,
      source: "manual",
      externalId: `manual-sim-${Date.now()}`,
    });

    const statusCode =
      result.status === "created" ? 201 : result.status === "duplicate" ? 200 : 422;

    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Error al registrar encuesta.",
      },
      { status: 500 },
    );
  }
}
