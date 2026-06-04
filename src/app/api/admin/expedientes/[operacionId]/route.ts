import { NextResponse } from "next/server";
import {
  getExpedienteDetail,
  setEngancheCubierto,
  setPersonaMoralOperacion,
  uploadExpedienteDocumento,
} from "@/lib/admin/expediente-service";
import { getComisionContext } from "@/lib/admin/comision-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import {
  getChecklistItem,
  type ExpedienteChecklistEtapa,
} from "@/lib/comercial/expediente-checklist";

type RouteContext = { params: Promise<{ operacionId: string }> };

function isExpedienteChecklistEtapa(value: string): value is ExpedienteChecklistEtapa {
  return value === "apartado" || value === "contrato" || value === "cancelacion";
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "expedientes")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { operacionId } = await context.params;

  try {
    const [expediente, comision] = await Promise.all([
      getExpedienteDetail(operacionId, session.profile),
      getComisionContext(operacionId, session.profile),
    ]);

    if (!expediente) {
      return NextResponse.json({ error: "Operación no encontrada." }, { status: 404 });
    }

    return NextResponse.json({
      expediente,
      comision: {
        elegibilidad: comision.elegibilidad,
        solicitudes: comision.solicitudes,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar expediente." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "expedientes")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { operacionId } = await context.params;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const checklistCodigo = String(formData.get("checklistCodigo") ?? formData.get("tipo") ?? "")
      .trim()
      .toUpperCase();
    const etapaRaw = String(formData.get("etapaChecklist") ?? "").trim();
    const nombre = String(formData.get("nombre") ?? "").trim();
    const notas = String(formData.get("notas") ?? "").trim();
    const confirmReplace = formData.get("confirmReplace") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
    }

    if (!checklistCodigo || !nombre) {
      return NextResponse.json({ error: "Completa tipo y nombre del documento." }, { status: 400 });
    }

    const detail = await getExpedienteDetail(operacionId, session.profile);
    if (!detail) {
      return NextResponse.json({ error: "Operación no encontrada." }, { status: 404 });
    }

    const item = getChecklistItem(detail.operacion.desarrollo_id, checklistCodigo);
    const etapaChecklist = isExpedienteChecklistEtapa(etapaRaw)
      ? etapaRaw
      : item?.etapa;

    const documento = await uploadExpedienteDocumento({
      operacionId,
      file,
      checklistCodigo,
      etapaChecklist,
      nombre,
      notas: notas || undefined,
      confirmReplace,
      adminId: session.userId,
      profile: session.profile,
    });

    return NextResponse.json({ documento }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "EXPEDIENTE_ALREADY_EXISTS" &&
      "existing" in error
    ) {
      return NextResponse.json(
        {
          error: "EXPEDIENTE_ALREADY_EXISTS",
          message: "Ya existe un documento activo de este tipo. Confirma si deseas reemplazarlo.",
          existing: error.existing,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al subir documento." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "expedientes")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { operacionId } = await context.params;

  try {
    const body = (await request.json()) as { engancheCubierto?: boolean; personaMoral?: boolean };

    if (typeof body.engancheCubierto === "boolean") {
      await setEngancheCubierto(operacionId, body.engancheCubierto, session.profile, session.userId);
    }
    if (typeof body.personaMoral === "boolean") {
      await setPersonaMoralOperacion(operacionId, body.personaMoral, session.profile);
    }

    const expediente = await getExpedienteDetail(operacionId, session.profile);
    return NextResponse.json({ expediente });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar operación." },
      { status: 500 },
    );
  }
}
