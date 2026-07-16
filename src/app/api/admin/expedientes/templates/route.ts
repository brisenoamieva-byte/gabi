import { NextResponse } from "next/server";
import { canAccessModule, isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import {
  listExpedienteTemplateStatuses,
  uploadExpedienteTemplate,
} from "@/lib/admin/expediente-templates-service";
import { canGenerateApartadoPack } from "@/lib/comercial/expediente-template-map";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "expedientes") && !isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const desarrolloId = new URL(request.url).searchParams.get("desarrolloId")?.trim();
  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }
  if (!canGenerateApartadoPack(desarrolloId)) {
    return NextResponse.json({ templates: [] });
  }

  try {
    const templates = await listExpedienteTemplateStatuses(desarrolloId);
    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar plantillas." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isSuperAdmin(session.profile) && !canAccessModule(session.profile, "expedientes")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const desarrolloId = String(formData.get("desarrolloId") ?? "").trim();
    const fileName = String(formData.get("fileName") ?? "").trim();
    const file = formData.get("file");

    if (!desarrolloId || !fileName || !(file instanceof File)) {
      return NextResponse.json(
        { error: "desarrolloId, fileName y file son requeridos." },
        { status: 400 },
      );
    }

    if (!fileName.endsWith(".docx")) {
      return NextResponse.json({ error: "Solo se aceptan archivos .docx." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadExpedienteTemplate({
      desarrolloId,
      fileName,
      buffer,
      contentType: file.type || undefined,
    });

    return NextResponse.json({
      ok: true,
      path: result.path,
      missingTags: result.missingTags,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al subir plantilla." },
      { status: 500 },
    );
  }
}
