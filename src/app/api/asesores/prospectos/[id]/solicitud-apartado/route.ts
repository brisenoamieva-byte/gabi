import { NextResponse } from "next/server";
import { getProspectoForAsesor } from "@/lib/asesores/prospectos-service";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";
import {
  createSolicitudApartado,
  getSolicitudApartadoPendiente,
} from "@/lib/comercial/solicitud-apartado-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { searchParams } = new URL(request.url);
  const { id } = await context.params;

  try {
    const asesorId = resolveAsesorIdForApi(searchParams.get("asesorId"));
    await getProspectoForAsesor(asesorId, id);
    const solicitud = await getSolicitudApartadoPendiente(id);
    return NextResponse.json({ solicitud });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al consultar solicitud." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      asesorId?: string;
      desarrolloNombre?: string;
      notas?: string;
      unidadId?: string;
      cotizacionId?: string;
    };
    const asesorId = resolveAsesorIdForApi(body.asesorId);
    const prospecto = await getProspectoForAsesor(asesorId, id);

    if (prospecto.etapa === "vendido" || prospecto.etapa === "perdido") {
      return NextResponse.json({ error: "Este prospecto está cerrado." }, { status: 400 });
    }

    const cotizacion = body.cotizacionId
      ? prospecto.cotizaciones.find((item) => item.id === body.cotizacionId)
      : prospecto.cotizaciones[0];

    const solicitud = await createSolicitudApartado({
      prospectoId: id,
      desarrolloId: prospecto.desarrollo_id,
      asesorId,
      asesorNombre: prospecto.asesorNombre ?? "Asesor",
      prospectoNombre: prospecto.nombre,
      desarrolloNombre: body.desarrolloNombre?.trim() || prospecto.desarrollo_id,
      unidadId: body.unidadId ?? cotizacion?.unidad_id ?? undefined,
      cotizacionId: body.cotizacionId ?? cotizacion?.id,
      notas: body.notas,
    });

    return NextResponse.json({ solicitud }, { status: 201 });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al solicitar apartado." },
      { status: 400 },
    );
  }
}
