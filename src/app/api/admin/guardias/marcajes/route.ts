import { NextResponse } from "next/server";
import { listGuardiaMarcajesDia, todayYmd } from "@/lib/admin/guardia-marcajes-service";
import { listAsesores } from "@/lib/admin/asesores-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "guardias")) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();
  const fecha = searchParams.get("fecha")?.trim() || todayYmd();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  if (!canAccessDesarrollo(session.profile, desarrolloId)) {
    return NextResponse.json({ error: "Sin permiso para este desarrollo." }, { status: 403 });
  }

  try {
    const asesores = await listAsesores({ desarrolloId }, session.profile);
    const asesorNames = Object.fromEntries(asesores.map((a) => [a.id, a.nombre]));
    const payload = await listGuardiaMarcajesDia(
      desarrolloId,
      fecha,
      session.profile,
      asesorNames,
    );
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar marcajes." },
      { status: 400 },
    );
  }
}
