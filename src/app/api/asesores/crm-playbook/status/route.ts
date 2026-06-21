import { NextResponse } from "next/server";
import { getCrmPlaybookConfig } from "@/lib/comercial/crm-playbook-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    resolveAsesorIdForApi(searchParams.get("asesorId"));
    const config = await getCrmPlaybookConfig(desarrolloId);
    return NextResponse.json({
      enabled: Boolean(config?.enabled),
      config: config?.enabled ? config : null,
    });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar playbook." },
      { status: 400 },
    );
  }
}
