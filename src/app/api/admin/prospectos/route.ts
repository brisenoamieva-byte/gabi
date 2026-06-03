import { NextResponse } from "next/server";
import {
  createProspecto,
  getProspectosResumen,
  listProspectos,
  type ProspectoInput,
} from "@/lib/admin/prospectos-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId") ?? undefined;
  const etapa = searchParams.get("etapa") ?? undefined;
  const asesorId = searchParams.get("asesorId") ?? undefined;
  const campanaId = searchParams.get("campanaId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const desde = searchParams.get("desde") ?? undefined;
  const hasta = searchParams.get("hasta") ?? undefined;
  const spam = searchParams.get("spam") as "exclude" | "only" | "include" | null;
  const duplicados = searchParams.get("duplicados") as "exclude" | "only" | "include" | null;
  const nivelInteres = searchParams.get("nivelInteres") ?? undefined;
  const withResumen = searchParams.get("resumen") === "1";

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  const sharedFilters = {
    asesorId,
    search,
    desde,
    hasta,
    campanaId,
    spam: spam ?? "exclude",
    duplicados: duplicados ?? "exclude",
  };

  try {
    const [prospectos, resumen] = await Promise.all([
      listProspectos({ desarrolloId, etapa, nivelInteres, ...sharedFilters }, session.profile),
      withResumen
        ? getProspectosResumen(desarrolloId, session.profile, sharedFilters)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({ prospectos, resumen });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar prospectos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as ProspectoInput;

    if (!body.desarrolloId || !body.nombre?.trim()) {
      return NextResponse.json({ error: "Completa desarrollo y nombre." }, { status: 400 });
    }

    if (!canAccessDesarrollo(session.profile, body.desarrolloId)) {
      return NextResponse.json({ error: "Sin permiso para este desarrollo." }, { status: 403 });
    }

    const prospecto = await createProspecto(body);
    return NextResponse.json({ prospecto }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear prospecto." },
      { status: 400 },
    );
  }
}
