import { NextResponse } from "next/server";
import { getProspectoById } from "@/lib/admin/prospectos-service";
import { getProspectoCompliance } from "@/lib/comercial/crm-compliance-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const prospecto = await getProspectoById(id, session.profile);
    if (!prospecto) {
      return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });
    }

    const compliance = await getProspectoCompliance(prospecto);
    return NextResponse.json({ compliance });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al evaluar cumplimiento." },
      { status: 500 },
    );
  }
}
