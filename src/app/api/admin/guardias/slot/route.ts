import { NextResponse } from "next/server";
import { clearGuardiaSlot } from "@/lib/admin/guardias-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { isGuardiaTurno } from "@/lib/comercial/guardias";
import { getAdminSession } from "@/lib/admin/session";

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "guardias")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim() ?? "";
  const fecha = searchParams.get("fecha")?.trim() ?? "";
  const turno = searchParams.get("turno")?.trim() ?? "";

  if (!desarrolloId || !fecha || !isGuardiaTurno(turno)) {
    return NextResponse.json({ error: "Parámetros incompletos." }, { status: 400 });
  }

  if (!canAccessDesarrollo(session.profile, desarrolloId)) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  try {
    await clearGuardiaSlot(desarrolloId, fecha, turno, session.profile);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al quitar guardia." },
      { status: 500 },
    );
  }
}
