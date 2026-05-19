import { NextResponse } from "next/server";
import { desarrollos } from "@/lib/data";

type ContactPayload = {
  desarrolloId?: string;
  asesorId?: string;
  cliente?: {
    nombre?: string;
    email?: string;
    telefono?: string;
    medioContacto?: string;
  };
};

const splitName = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstname = parts.shift() ?? "";
  const lastname = parts.join(" ");

  return { firstname, lastname };
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ContactPayload;
    const desarrollo = desarrollos.find((item) => item.id === payload.desarrolloId);

    if (!desarrollo) {
      return NextResponse.json(
        { status: "error", message: "Desarrollo no configurado" },
        { status: 400 },
      );
    }

    if (!desarrollo.crm.enabled || desarrollo.crm.provider !== "hubspot") {
      return NextResponse.json({ status: "queued", reason: "crm_disabled" });
    }

    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!token) {
      return NextResponse.json({ status: "queued", reason: "missing_token" });
    }

    const { firstname, lastname } = splitName(payload.cliente?.nombre);
    const properties: Record<string, string> = {
      lifecyclestage: "lead",
    };

    if (firstname) {
      properties.firstname = firstname;
    }

    if (lastname) {
      properties.lastname = lastname;
    }

    if (payload.cliente?.email) {
      properties.email = payload.cliente.email.toLowerCase().trim();
    }

    if (payload.cliente?.telefono) {
      properties.phone = payload.cliente.telefono.replace(/\D/g, "");
    }

    const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    if (response.status === 409) {
      return NextResponse.json({ status: "duplicate", reason: "hubspot_duplicate" });
    }

    if (!response.ok) {
      const detail = await response.text();

      return NextResponse.json(
        { status: "queued", reason: "hubspot_error", detail },
        { status: 202 },
      );
    }

    const data = await response.json();

    return NextResponse.json({ status: "synced", provider: "hubspot", crmId: data.id });
  } catch (error) {
    return NextResponse.json(
      {
        status: "queued",
        reason: "request_failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 202 },
    );
  }
}
