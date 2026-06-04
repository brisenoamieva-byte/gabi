import { NextResponse } from "next/server";
import { ingestParseurLead } from "@/lib/admin/parseur-ingest-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      campanaId?: string;
      nombre?: string;
      email?: string;
      telefono?: string;
      ciudad?: string;
      vendedor?: string;
    };

    if (!body.campanaId?.trim()) {
      return NextResponse.json({ error: "Selecciona una campaña." }, { status: 400 });
    }

    if (!body.nombre?.trim() && !body.email?.trim() && !body.telefono?.trim()) {
      return NextResponse.json(
        { error: "Indica al menos nombre, email o teléfono." },
        { status: 400 },
      );
    }

    const suffix = Date.now();
    const payload = {
      nombre: body.nombre?.trim() || `Lead prueba ${suffix}`,
      email: body.email?.trim() || `prueba-${suffix}@gabi.test`,
      telefono: body.telefono?.trim() || `55${String(suffix).slice(-8)}`,
      ciudad: body.ciudad?.trim(),
      vendedor: body.vendedor?.trim(),
      medio: "Simulación admin",
    };

    const result = await ingestParseurLead({
      payload,
      campanaId: body.campanaId.trim(),
    });

    const statusCode =
      result.status === "created"
        ? 201
        : result.status === "duplicate"
          ? 200
          : result.status === "rejected"
            ? 422
            : 500;

    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Error al simular." },
      { status: 500 },
    );
  }
}
