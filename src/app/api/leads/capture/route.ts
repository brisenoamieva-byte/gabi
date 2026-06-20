import { NextResponse } from "next/server";
import { createCommercialLead } from "@/lib/comercial/commercial-lead-create";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type CaptureBody = {
  desarrolloId?: string;
  campanaId?: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  origenCiudad?: string;
  notas?: string;
  source?: string;
};

export async function POST(request: Request) {
  const captureSecret = process.env.LEAD_CAPTURE_SECRET?.trim();
  if (captureSecret) {
    const provided = request.headers.get("x-lead-capture-secret");
    if (provided !== captureSecret) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
  }

  try {
    const body = (await request.json()) as CaptureBody;

    if (!body.desarrolloId?.trim()) {
      return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
    }

    const nombre = body.nombre?.trim();
    const email = body.email?.trim();
    const telefono = body.telefono?.trim();

    if (!nombre && !email && !telefono) {
      return NextResponse.json(
        { error: "Proporciona nombre, email o teléfono." },
        { status: 400 },
      );
    }

    let campanaId = body.campanaId?.trim() || null;
    if (campanaId) {
      const supabase = createSupabaseServiceClient();
      if (supabase) {
        const { data } = await supabase
          .from("campanas")
          .select("id")
          .eq("id", campanaId)
          .eq("desarrollo_id", body.desarrolloId.trim())
          .eq("activo", true)
          .maybeSingle();

        if (!data) {
          campanaId = null;
        }
      }
    }

    const result = await createCommercialLead({
      desarrolloId: body.desarrolloId.trim(),
      campanaId,
      nombre: nombre ?? "",
      email,
      telefono,
      origenCiudad: body.origenCiudad,
      medioContacto: body.source?.trim() || "Landing gabi",
      medioPublicitario: body.source?.trim() || "Landing",
      notas: body.notas,
    });

    const statusCode =
      result.status === "created"
        ? 201
        : result.status === "duplicate"
          ? 200
          : result.status === "rejected"
            ? 422
            : 500;

    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Error interno." },
      { status: 500 },
    );
  }
}
