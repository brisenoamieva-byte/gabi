import { NextResponse } from "next/server";
import {
  listGuardiaConflictos,
  listGuardiasWeek,
  publishGuardiasWeek,
  upsertGuardiaAsignacion,
} from "@/lib/admin/guardias-service";
import { listAsesores } from "@/lib/admin/asesores-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getWeekStartMonday, isGuardiaTurno } from "@/lib/comercial/guardias";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "guardias")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim() ?? "";
  const weekStart = searchParams.get("weekStart")?.trim() || getWeekStartMonday();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  if (!canAccessDesarrollo(session.profile, desarrolloId)) {
    return NextResponse.json({ error: "Sin permiso para este desarrollo." }, { status: 403 });
  }

  try {
    const week = await listGuardiasWeek(desarrolloId, weekStart, session.profile);
    const conflictos = await listGuardiaConflictos(desarrolloId, weekStart, session.profile);
    const asesores = await listAsesores({ desarrolloId }, session.profile);

    return NextResponse.json({ week, conflictos, asesores });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar guardias." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "guardias")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      desarrolloId?: string;
      weekStart?: string;
      asesorId?: string;
      fecha?: string;
      turno?: string;
    };

    const desarrolloId = body.desarrolloId?.trim() ?? "";
    if (!desarrolloId || !canAccessDesarrollo(session.profile, desarrolloId)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    if (body.action === "publish") {
      const weekStart = body.weekStart?.trim() || getWeekStartMonday();
      const result = await publishGuardiasWeek(desarrolloId, weekStart, session.profile);
      return NextResponse.json(result);
    }

    const asesorId = body.asesorId?.trim() ?? "";
    const fecha = body.fecha?.trim() ?? "";
    const turno = body.turno?.trim() ?? "";

    if (!asesorId || !fecha || !isGuardiaTurno(turno)) {
      return NextResponse.json(
        { error: "Completa desarrolloId, asesorId, fecha y turno válido." },
        { status: 400 },
      );
    }

    const asignacion = await upsertGuardiaAsignacion(
      { desarrolloId, asesorId, fecha, turno },
      session.profile,
      session.userId,
    );

    return NextResponse.json({ asignacion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar guardia." },
      { status: 500 },
    );
  }
}
