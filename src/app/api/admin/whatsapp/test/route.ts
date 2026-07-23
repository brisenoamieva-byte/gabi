import { NextResponse } from "next/server";
import { canAccessCrmComplianceApi, canAccessModule } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { isWhatsAppCloudConfigured, getWhatsAppCloudConfig } from "@/lib/whatsapp/config";
import {
  WHATSAPP_TEMPLATE_ASESOR,
  WHATSAPP_TEMPLATE_COMPLIANCE,
  WHATSAPP_TEMPLATE_PROSPECT,
  DEFAULT_WHATSAPP_TEMPLATE_TEXTS,
} from "@/lib/whatsapp/templates";
import {
  sendAsesorComplianceNudge,
  sendAsesorLeadAlert,
  sendHelloWorldTest,
  sendProspectLeadConfirmation,
} from "@/lib/whatsapp/meta-cloud-api";

const requireWhatsAppTestAccess = async (
  template: "prospect" | "asesor" | "compliance" | "hello_world",
) => {
  const session = await getAdminSession();
  if (!session) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  if (template === "compliance") {
    if (!canAccessCrmComplianceApi(session.profile)) {
      return { error: NextResponse.json({ error: "Sin permiso" }, { status: 403 }) };
    }
    return { session };
  }

  if (!canAccessModule(session.profile, "leads")) {
    return { error: NextResponse.json({ error: "Sin permiso" }, { status: 403 }) };
  }

  return { session };
};

export async function GET(request: Request) {
  try {
    const access = await requireWhatsAppTestAccess("compliance");
    if (access.error) {
      return access.error;
    }

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
        compliance: WHATSAPP_TEMPLATE_COMPLIANCE,
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
    const body = (await request.json()) as {
      desarrolloId?: string;
      telefono?: string;
      template?: "prospect" | "asesor" | "compliance" | "hello_world";
      desarrolloNombre?: string;
    };

    const template = body.template ?? "prospect";
    const access = await requireWhatsAppTestAccess(template);
    if (access.error) {
      return access.error;
    }

    const desarrolloId = body.desarrolloId?.trim();
    const telefono = body.telefono?.trim();
    const desarrolloNombre = body.desarrolloNombre?.trim() || "Misión La Gavia";

    if (!desarrolloId || !telefono) {
      return NextResponse.json({ error: "desarrolloId y telefono requeridos." }, { status: 400 });
    }

    const config = getWhatsAppCloudConfig(desarrolloId);
    const diagnostic = {
      desarrolloId,
      enabled: config.enabled,
      hasAccessToken: Boolean(config.accessToken),
      hasPhoneNumberId: Boolean(config.phoneNumberId),
      configured: isWhatsAppCloudConfigured(desarrolloId),
      template,
    };

    if (template === "hello_world") {
      const result = await sendHelloWorldTest(desarrolloId, telefono);
      return NextResponse.json({ ...result, diagnostic });
    }

    if (template === "compliance") {
      const result = await sendAsesorComplianceNudge(
        desarrolloId,
        telefono,
        "Asesor de prueba",
        2,
        desarrolloNombre,
        "Contactar prospecto demo · Actualizar etapa en CRM",
      );

      return NextResponse.json({ ...result, diagnostic });
    }

    if (template === "asesor") {
      const result = await sendAsesorLeadAlert(
        desarrolloId,
        telefono,
        desarrolloNombre,
        "María Pérez (prueba)",
        telefono,
        "Prueba Gabi",
      );

      return NextResponse.json({ ...result, diagnostic });
    }

    const result = await sendProspectLeadConfirmation(
      desarrolloId,
      telefono,
      "María",
      desarrolloNombre,
      "Asesor de prueba",
    );

    return NextResponse.json({ ...result, diagnostic });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error." },
      { status: 500 },
    );
  }
}
