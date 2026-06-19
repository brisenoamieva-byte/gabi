import { NextResponse } from "next/server";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import {
  listObjetivosAnuales,
  upsertObjetivoAnual,
  type ComercialObjetivoInput,
} from "@/lib/admin/reporte-semanal/objetivos-service";
import { getReporteSemanalSegments } from "@/lib/admin/reporte-semanal/segment-config";
import { getObjetivosSegmentoSeed } from "@/lib/admin/reporte-semanal/objetivos-config";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "metricas")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId");
  const anio = Number(searchParams.get("anio") ?? new Date().getFullYear());

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  if (!canAccessDesarrollo(session.profile, desarrolloId)) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  try {
    const dbRows = await listObjetivosAnuales({ desarrolloId, anio }, session.profile);
    const segmentConfigs = getReporteSemanalSegments(desarrolloId) ?? [
      { id: "general", label: "General", clusterId: "__all__" },
    ];

    const objetivos = segmentConfigs.map((config) => {
      const db = dbRows.find((row) => row.segmento_id === config.id);
      const seed = getObjetivosSegmentoSeed(desarrolloId, config.id);

      return {
        segmentoId: config.id,
        label: config.label,
        origen: db ? ("db" as const) : seed ? ("seed" as const) : ("none" as const),
        valores: db
          ? {
              ventasUnidades: Number(db.ventas_unidades),
              apartadosObjetivo: Number(db.apartados_objetivo),
              ingresosTotales: Number(db.ingresos_totales),
              ingresosMes: Number(db.ingresos_mes),
              precioM2Objetivo: Number(db.precio_m2_objetivo),
              totalUnidades: db.total_unidades,
            }
          : seed,
      };
    });

    return NextResponse.json({ anio, objetivos });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al consultar objetivos." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "metricas")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as ComercialObjetivoInput;

    if (!body.desarrolloId || !body.segmentoId || !body.anio) {
      return NextResponse.json({ error: "Completa desarrollo, segmento y año." }, { status: 400 });
    }

    if (!canAccessDesarrollo(session.profile, body.desarrolloId)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const row = await upsertObjetivoAnual(body, session.profile);
    return NextResponse.json({ objetivo: row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar objetivos." },
      { status: 500 },
    );
  }
}
