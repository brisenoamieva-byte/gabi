import { NextResponse } from "next/server";
import { getDesarrollosByIds } from "@/lib/catalog/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids")?.trim();

  if (!idsParam) {
    return NextResponse.json({ error: "Parámetro ids requerido." }, { status: 400 });
  }

  const ids = idsParam.split(",").map((item) => item.trim()).filter(Boolean);
  const desarrollos = await getDesarrollosByIds(ids);

  return NextResponse.json({ desarrollos });
}
