import { NextResponse } from "next/server";
import {
  getClustersForDesarrollo,
  getDesarrolloById,
  getPrototiposForDesarrollo,
  getRecorridoContenidoForDesarrollo,
} from "@/lib/catalog/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  const [desarrollo, clusters, prototipos, recorridoContenido] = await Promise.all([
    getDesarrolloById(desarrolloId),
    getClustersForDesarrollo(desarrolloId),
    getPrototiposForDesarrollo(desarrolloId),
    getRecorridoContenidoForDesarrollo(desarrolloId),
  ]);

  if (!desarrollo) {
    return NextResponse.json({ error: "Desarrollo no encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    desarrollo,
    clusters,
    prototipos,
    recorridoEtapas: desarrollo.recorridoEtapas,
    recorridoVersion: desarrollo.recorridoVersion,
    recorridoContenido,
  });
}
