import { NextResponse } from "next/server";
import { getCrmPlaybookConfig, getPlaybookQueueForAsesor } from "@/lib/comercial/crm-playbook-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    const config = await getCrmPlaybookConfig(desarrolloId);
    const queue = await getPlaybookQueueForAsesor(asesorId, desarrolloId);
    return NextResponse.json({ config, queue });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar cola de playbook." },
      { status: 400 },
    );
  }
}
