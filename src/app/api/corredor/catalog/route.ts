import { NextResponse } from "next/server";
import { getResolvedCorredorCatalog } from "@/lib/corredor/corredor-overrides-store";

export async function GET() {
  const resolved = await getResolvedCorredorCatalog();
  return NextResponse.json({
    desarrollos: resolved.desarrollos,
    meta: resolved.meta,
  });
}
