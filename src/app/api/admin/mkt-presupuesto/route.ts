import { NextResponse } from "next/server";
import {
  getOrCreatePresupuesto,
  getPresupuestoBundle,
  getPresupuestoResumen,
  upsertPresupuesto,
} from "@/lib/admin/mkt-presupuesto-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "leads") && !canAccessModule(session.profile, "metricas")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId");
  const anio = Number(searchParams.get("anio") ?? new Date().getFullYear());
  const mode = searchParams.get("mode") ?? "bundle";

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }
  if (!canAccessDesarrollo(session.profile, desarrolloId)) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }
  if (!Number.isFinite(anio) || anio < 2020) {
    return NextResponse.json({ error: "Año inválido." }, { status: 400 });
  }

  try {
    if (mode === "resumen") {
      const resumen = await getPresupuestoResumen(desarrolloId, anio, session.profile);
      return NextResponse.json({ resumen });
    }

    const bundle = await getPresupuestoBundle(desarrolloId, anio, session.profile);
    return NextResponse.json(bundle);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar presupuesto MKT." },
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
    const body = (await request.json()) as {
      action?: "ensure" | "upsert";
      desarrolloId?: string;
      anio?: number;
      montoAutorizado?: number;
      notas?: string | null;
      activo?: boolean;
    };

    if (!body.desarrolloId || !body.anio) {
      return NextResponse.json({ error: "desarrolloId y anio son requeridos." }, { status: 400 });
    }
    if (!canAccessDesarrollo(session.profile, body.desarrolloId)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    if (body.action === "ensure") {
      const presupuesto = await getOrCreatePresupuesto(
        body.desarrolloId,
        body.anio,
        session.profile,
      );
      return NextResponse.json({ presupuesto }, { status: 201 });
    }

    if (body.montoAutorizado === undefined) {
      return NextResponse.json({ error: "montoAutorizado requerido." }, { status: 400 });
    }

    const presupuesto = await upsertPresupuesto(
      {
        desarrolloId: body.desarrolloId,
        anio: body.anio,
        montoAutorizado: body.montoAutorizado,
        notas: body.notas,
        activo: body.activo,
      },
      session.profile,
    );
    return NextResponse.json({ presupuesto });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar presupuesto." },
      { status: 400 },
    );
  }
}
