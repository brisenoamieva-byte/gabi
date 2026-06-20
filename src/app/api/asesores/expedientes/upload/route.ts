import { NextResponse } from "next/server";
import { uploadExpedienteDocumentoAsesor } from "@/lib/asesores/expediente-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const prospectoId = String(formData.get("prospectoId") ?? "").trim();
    const checklistCodigo = String(formData.get("checklistCodigo") ?? "").trim();
    const nombre = String(formData.get("nombre") ?? "").trim();
    const confirmReplace = formData.get("confirmReplace") === "true";
    const file = formData.get("file");

    const asesorId = resolveAsesorIdForApi(String(formData.get("asesorId") ?? "").trim());

    if (!prospectoId || !checklistCodigo) {
      return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
    }

    const documento = await uploadExpedienteDocumentoAsesor({
      asesorId,
      prospectoId,
      checklistCodigo,
      file,
      nombre,
      confirmReplace,
    });

    return NextResponse.json({ documento });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    const message = error instanceof Error ? error.message : "Error al subir documento.";
    const status = message.includes("EXPEDIENTE_ALREADY_EXISTS") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
