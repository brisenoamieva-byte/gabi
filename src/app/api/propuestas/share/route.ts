import { NextResponse } from "next/server";
import { assertGabiOperator } from "@/lib/propuestas/share-operator";
import { expiryFromPreset, type ShareExpiryPresetId } from "@/lib/propuestas/share-constants";
import {
  createShareAccess,
  getActiveShareBySlug,
  regenerateShareCode,
  revokeShareAccess,
  updateShareExpiry,
} from "@/lib/propuestas/share-service";
import { getPropuestaBySlug } from "@/lib/propuestas/registry";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug")?.trim() ?? "";
    const operatorEmail = searchParams.get("operatorEmail")?.trim() ?? "";

    if (!slug) {
      return NextResponse.json({ error: "Slug requerido." }, { status: 400 });
    }

    assertGabiOperator(operatorEmail);

    const propuesta = getPropuestaBySlug(slug);
    if (!propuesta) {
      return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
    }

    const share = await getActiveShareBySlug(slug);
    if (!share) {
      return NextResponse.json({ share: null });
    }

    return NextResponse.json({
      share: {
        token: share.token,
        propuestaSlug: share.propuesta_slug,
        tituloCliente: share.titulo_cliente,
        activo: share.activo,
        expiresAt: share.expires_at,
        createdAt: share.created_at,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "OPERATOR_FORBIDDEN") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      slug?: string;
      operatorEmail?: string;
      action?: "create" | "regenerate" | "revoke" | "update_expiry";
      tituloCliente?: string;
      expiryPreset?: ShareExpiryPresetId;
      expiresAt?: string | null;
    };

    const slug = body.slug?.trim() ?? "";
    const operatorEmail = body.operatorEmail?.trim() ?? "";
    const action = body.action ?? "create";

    if (!slug) {
      return NextResponse.json({ error: "Slug requerido." }, { status: 400 });
    }

    assertGabiOperator(operatorEmail);

    const propuesta = getPropuestaBySlug(slug);
    if (!propuesta) {
      return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
    }

    if (action === "revoke") {
      await revokeShareAccess(slug);
      return NextResponse.json({ ok: true });
    }

    if (action === "regenerate") {
      const result = await regenerateShareCode({ slug, operatorEmail });
      return NextResponse.json({
        share: result.share,
        codigo: result.codigo,
      });
    }

    if (action === "update_expiry") {
      const expiresAt =
        body.expiresAt !== undefined
          ? body.expiresAt
          : body.expiryPreset
            ? expiryFromPreset(body.expiryPreset)
            : null;
      const result = await updateShareExpiry({ slug, operatorEmail, expiresAt });
      return NextResponse.json({ share: result.share });
    }

    const expiresAt =
      body.expiresAt !== undefined
        ? body.expiresAt
        : body.expiryPreset
          ? expiryFromPreset(body.expiryPreset)
          : undefined;

    const result = await createShareAccess({
      slug,
      operatorEmail,
      tituloCliente: body.tituloCliente ?? propuesta.meta.preparadoPara,
      expiresAt,
    });

    return NextResponse.json({
      share: result.share,
      codigo: result.codigo,
      created: result.created,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "OPERATOR_FORBIDDEN") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 },
    );
  }
}
