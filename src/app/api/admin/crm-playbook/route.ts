import { NextResponse } from "next/server";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import {
  getCrmPlaybookConfig,
  upsertCrmPlaybookConfig,
} from "@/lib/comercial/crm-playbook-service";
import type { PlaybookStep } from "@/lib/comercial/crm-playbook";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  try {
    const config = await getCrmPlaybookConfig(desarrolloId);
    if (!config) {
      return NextResponse.json({ error: "Desarrollo sin playbook piloto." }, { status: 404 });
    }
    return NextResponse.json({ config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar playbook." },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      desarrolloId?: string;
      enabled?: boolean;
      blockEtapa?: boolean;
      steps?: PlaybookStep[];
    };

    const desarrolloId = body.desarrolloId?.trim();
    if (!desarrolloId) {
      return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
    }

    const config = await upsertCrmPlaybookConfig(
      desarrolloId,
      {
        enabled: body.enabled ?? true,
        blockEtapa: body.blockEtapa ?? true,
        steps: body.steps ?? [],
      },
      session.profile.id,
    );

    return NextResponse.json({ config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar playbook." },
      { status: 400 },
    );
  }
}
