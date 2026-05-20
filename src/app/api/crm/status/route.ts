import { NextResponse } from "next/server";
import { desarrollos } from "@/lib/data";

export async function GET() {
  const hubspotConfigured = Boolean(process.env.HUBSPOT_PRIVATE_APP_TOKEN?.trim());
  const crmEnabled = desarrollos.some(
    (desarrollo) => desarrollo.crm.enabled && desarrollo.crm.provider === "hubspot",
  );

  return NextResponse.json({
    configured: hubspotConfigured && crmEnabled,
    provider: crmEnabled ? "hubspot" : null,
  });
}
