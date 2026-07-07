import { NextResponse } from "next/server";
import {
  bulkDeactivateProspectos,
  bulkReassignProspectos,
} from "@/lib/admin/prospectos-service";
import {
  canAccessModule,
  canDeleteProspectos,
  canReassignProspectos,
} from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

type BulkAction = "delete" | "reassign";

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
      action?: BulkAction;
      ids?: string[];
      asesorId?: string;
    };
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const action: BulkAction = body.action === "reassign" ? "reassign" : "delete";

    if (!ids.length) {
      return NextResponse.json({ error: "Selecciona al menos un lead." }, { status: 400 });
    }

    if (action === "reassign") {
      if (!canReassignProspectos(session.profile)) {
        return NextResponse.json({ error: "Sin permiso para reasignar." }, { status: 403 });
      }

      if (!body.asesorId?.trim()) {
        return NextResponse.json({ error: "Selecciona un asesor." }, { status: 400 });
      }

      const reassigned = await bulkReassignProspectos(ids, body.asesorId, session.profile);
      return NextResponse.json({ reassigned });
    }

    if (!canDeleteProspectos(session.profile)) {
      return NextResponse.json(
        { error: "Solo el administrador universal puede eliminar prospectos." },
        { status: 403 },
      );
    }

    const deleted = await bulkDeactivateProspectos(ids, session.profile);
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al procesar la acción masiva de leads.",
      },
      { status: 400 },
    );
  }
}
