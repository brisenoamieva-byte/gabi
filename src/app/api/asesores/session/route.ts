import { NextResponse } from "next/server";
import { getAsesorSessionById } from "@/lib/asesores/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json({ error: "Parámetro id requerido." }, { status: 400 });
  }

  const asesor = await getAsesorSessionById(id);
  if (!asesor) {
    return NextResponse.json({ error: "Asesor no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ asesor });
}
