import { NextResponse } from "next/server";
import { getCrmPlaybookConfig } from "@/lib/comercial/crm-playbook-service";
import { getPlaybookQueueForAsesor } from "@/lib/comercial/crm-playbook-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asesorId = searchParams.get("asesorId")?.trim();
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!asesorId || !desarrolloId) {
    return NextResponse.json({ error: "asesorId y desarrolloId requeridos." }, { status: 400 });
  }

  try {
    const config = await getCrmPlaybookConfig(desarrolloId);
    const queue = await getPlaybookQueueForAsesor(asesorId, desarrolloId);
    return NextResponse.json({ config, queue });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar cola de playbook." },
      { status: 400 },
    );
  }
}
