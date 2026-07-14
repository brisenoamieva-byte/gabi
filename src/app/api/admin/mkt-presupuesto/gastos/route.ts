import { NextResponse } from "next/server";
import { createGasto, listGastos } from "@/lib/admin/mkt-presupuesto-service";
import { canAccessDesarrollo, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { isMktGastoEstatus } from "@/lib/comercial/mkt-presupuesto";

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
  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }
  if (!canAccessDesarrollo(session.profile, desarrolloId)) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const estatusRaw = searchParams.get("estatus");
  const estatus =
    estatusRaw === "activos"
      ? "activos"
      : estatusRaw && isMktGastoEstatus(estatusRaw)
        ? estatusRaw
        : undefined;

  try {
    const gastos = await listGastos(
      {
        desarrolloId,
        presupuestoId: searchParams.get("presupuestoId") ?? undefined,
        desde: searchParams.get("desde") ?? undefined,
        hasta: searchParams.get("hasta") ?? undefined,
        estatus,
      },
      session.profile,
    );
    return NextResponse.json({ gastos });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar gastos." },
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
      desarrolloId?: string;
      presupuestoId?: string | null;
      partidaId?: string | null;
      campanaId?: string | null;
      fechaRegistro?: string;
      fechaFactura?: string | null;
      fechaPago?: string | null;
      proveedor?: string;
      descripcion?: string;
      facturaRef?: string | null;
      montoSinIva?: number;
      iva?: number;
      total?: number;
      estatus?: string;
      observaciones?: string | null;
    };

    if (!body.desarrolloId || !body.proveedor?.trim() || !body.descripcion?.trim()) {
      return NextResponse.json(
        { error: "desarrolloId, proveedor y descripción son obligatorios." },
        { status: 400 },
      );
    }
    if (!canAccessDesarrollo(session.profile, body.desarrolloId)) {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }

    const gasto = await createGasto(
      {
        desarrolloId: body.desarrolloId,
        presupuestoId: body.presupuestoId,
        partidaId: body.partidaId,
        campanaId: body.campanaId,
        fechaRegistro: body.fechaRegistro ?? new Date().toISOString().slice(0, 10),
        fechaFactura: body.fechaFactura,
        fechaPago: body.fechaPago,
        proveedor: body.proveedor,
        descripcion: body.descripcion,
        facturaRef: body.facturaRef,
        montoSinIva: Number(body.montoSinIva ?? 0),
        iva: Number(body.iva ?? 0),
        total: body.total !== undefined ? Number(body.total) : undefined,
        estatus: body.estatus && isMktGastoEstatus(body.estatus) ? body.estatus : "pendiente",
        observaciones: body.observaciones,
      },
      session.profile,
    );
    return NextResponse.json({ gasto }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear gasto." },
      { status: 400 },
    );
  }
}
