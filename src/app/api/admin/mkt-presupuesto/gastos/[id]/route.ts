import { NextResponse } from "next/server";
import { deleteGasto, updateGasto } from "@/lib/admin/mkt-presupuesto-service";
import { canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { isMktGastoEstatus } from "@/lib/comercial/mkt-presupuesto";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const gasto = await updateGasto(
      id,
      {
        presupuestoId: body.presupuestoId as string | null | undefined,
        partidaId: body.partidaId as string | null | undefined,
        campanaId: body.campanaId as string | null | undefined,
        fechaRegistro: body.fechaRegistro as string | undefined,
        fechaFactura: body.fechaFactura as string | null | undefined,
        fechaPago: body.fechaPago as string | null | undefined,
        proveedor: body.proveedor as string | undefined,
        descripcion: body.descripcion as string | undefined,
        facturaRef: body.facturaRef as string | null | undefined,
        montoSinIva: body.montoSinIva !== undefined ? Number(body.montoSinIva) : undefined,
        iva: body.iva !== undefined ? Number(body.iva) : undefined,
        total: body.total !== undefined ? Number(body.total) : undefined,
        estatus:
          typeof body.estatus === "string" && isMktGastoEstatus(body.estatus)
            ? body.estatus
            : undefined,
        observaciones: body.observaciones as string | null | undefined,
      },
      session.profile,
    );
    return NextResponse.json({ gasto });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar gasto." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessModule(session.profile, "leads")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    await deleteGasto(id, session.profile);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al eliminar gasto." },
      { status: 400 },
    );
  }
}
