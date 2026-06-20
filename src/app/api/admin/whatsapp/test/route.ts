import { NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/admin/guards";
import { isWhatsAppCloudConfigured, getWhatsAppCloudConfig } from "@/lib/whatsapp/config";
import {
  WHATSAPP_TEMPLATE_ASESOR,
  WHATSAPP_TEMPLATE_PROSPECT,
  DEFAULT_WHATSAPP_TEMPLATE_TEXTS,
} from "@/lib/whatsapp/templates";
import { sendProspectLeadConfirmation } from "@/lib/whatsapp/meta-cloud-api";

export async function GET(request: Request) {
  try {
    await requireAdminModule("leads");
    const desarrolloId = new URL(request.url).searchParams.get("desarrolloId")?.trim();

    if (!desarrolloId) {
      return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
    }

    const config = getWhatsAppCloudConfig(desarrolloId);

    return NextResponse.json({
      configured: isWhatsAppCloudConfigured(desarrolloId),
      enabled: config.enabled,
      hasAccessToken: Boolean(config.accessToken),
      hasPhoneNumberId: Boolean(config.phoneNumberId),
      templates: {
        prospect: WHATSAPP_TEMPLATE_PROSPECT,
        asesor: WHATSAPP_TEMPLATE_ASESOR,
        language: "es_MX",
        proposedTexts: DEFAULT_WHATSAPP_TEMPLATE_TEXTS,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminModule("leads");
    const body = (await request.json()) as {
      desarrolloId?: string;
      telefono?: string;
    };

    const desarrolloId = body.desarrolloId?.trim();
    const telefono = body.telefono?.trim();

    if (!desarrolloId || !telefono) {
      return NextResponse.json({ error: "desarrolloId y telefono requeridos." }, { status: 400 });
    }

    const result = await sendProspectLeadConfirmation(
      desarrolloId,
      telefono,
      "Prueba",
      "Desarrollo piloto",
      "Asesor de prueba",
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error." },
      { status: 500 },
    );
  }
}
