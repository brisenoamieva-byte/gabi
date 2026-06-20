import { NextResponse } from "next/server";
import { saveCotizacion, upsertProspectoFromVisita } from "@/lib/admin/prospectos-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const asesorId = resolveAsesorIdForApi(body.asesorId as string | undefined);

    if (!body.desarrolloId) {
      return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
    }

    let prospectoId = body.prospectoId as string | undefined;

    if (!prospectoId && body.clienteNombre?.trim()) {
      const prospecto = await upsertProspectoFromVisita({
        desarrolloId: body.desarrolloId,
        nombre: body.clienteNombre.trim(),
        email: body.clienteEmail,
        telefono: body.clienteTelefono,
        medioContacto: body.medioContacto,
        asesorId,
        etapa: "cotizo",
      });
      prospectoId = prospecto.id;
    }

    const cotizacion = await saveCotizacion({
      desarrolloId: body.desarrolloId,
      prospectoId,
      asesorId,
      unidadId: body.unidadId,
      clusterId: body.clusterId,
      prototipoId: body.prototipoId,
      unidadNumero: body.unidadNumero,
      tipoUnidad: body.tipoUnidad,
      clienteNombre: body.clienteNombre,
      precioLista: body.precioLista,
      esquemaPago: body.esquemaPago,
      descuentoPct: body.descuentoPct,
      precioTotal: body.precioTotal,
      payload: body.payload,
      pdfGenerado: body.pdfGenerado,
    });

    return NextResponse.json({ cotizacion, prospectoId });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al guardar cotización." },
      { status: 500 },
    );
  }
}
