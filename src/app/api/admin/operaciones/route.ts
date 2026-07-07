import { NextResponse } from "next/server";
import {
  createOperacionApartado,
  getApartadoContextFromProspecto,
  getApartadoPrefill,
  type CreateApartadoInput,
} from "@/lib/admin/operaciones-service";
import { canAccessModule, canRegisterApartado } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "sembrado")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId");
  const unidadId = searchParams.get("unidadId");
  const prospectoId = searchParams.get("prospectoId");

  if (prospectoId) {
    if (!canAccessModule(session.profile, "leads") && !canAccessModule(session.profile, "sembrado")) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    try {
      const context = await getApartadoContextFromProspecto(prospectoId, session.profile);
      return NextResponse.json(context);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Error al cargar datos." },
        { status: 400 },
      );
    }
  }

  if (!desarrolloId || !unidadId) {
    return NextResponse.json({ error: "desarrolloId y unidadId requeridos." }, { status: 400 });
  }

  try {
    const prefill = await getApartadoPrefill(desarrolloId, unidadId, session.profile);
    return NextResponse.json({ prefill });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cargar datos." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "sembrado")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  if (!canRegisterApartado(session.profile)) {
    return NextResponse.json(
      { error: "Solo gerencia puede registrar apartados." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as CreateApartadoInput;

    if (!body.desarrolloId || !body.unidadId || !body.clienteNombre?.trim()) {
      return NextResponse.json(
        { error: "Completa desarrollo, unidad y nombre del cliente." },
        { status: 400 },
      );
    }

    const operacion = await createOperacionApartado(body, session.profile);
    return NextResponse.json({ operacion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al registrar apartado." },
      { status: 400 },
    );
  }
}
