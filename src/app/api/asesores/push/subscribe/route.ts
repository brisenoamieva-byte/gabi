import { NextResponse } from "next/server";
import {
  deleteAsesorPushSubscription,
  isWebPushConfigured,
  upsertAsesorPushSubscription,
} from "@/lib/push/web-push";
import { asesorSessionErrorResponse, resolveAsesorIdForApi } from "@/lib/asesores/session-api";

type SubscribeBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  userAgent?: string;
};

export async function POST(request: Request) {
  try {
    const asesorId = resolveAsesorIdForApi(null);
    if (!isWebPushConfigured()) {
      return NextResponse.json(
        { error: "Web Push no configurado en el servidor." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as SubscribeBody;
    const endpoint = body.endpoint?.trim();
    const p256dh = body.keys?.p256dh?.trim();
    const auth = body.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Suscripción incompleta (endpoint / keys)." },
        { status: 400 },
      );
    }

    const result = await upsertAsesorPushSubscription({
      asesorId,
      endpoint,
      keys: { p256dh, auth },
      userAgent: body.userAgent ?? request.headers.get("user-agent"),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "No se pudo guardar." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al suscribir." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const asesorId = resolveAsesorIdForApi(null);
    const body = (await request.json()) as { endpoint?: string };
    const endpoint = body.endpoint?.trim();
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint requerido." }, { status: 400 });
    }

    const result = await deleteAsesorPushSubscription({ asesorId, endpoint });
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "No se pudo eliminar." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = asesorSessionErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al desuscribir." },
      { status: 400 },
    );
  }
}
