import { NextResponse } from "next/server";
import {
  getClustersForDesarrollo,
  getDesarrolloById,
  getPrototiposForDesarrollo,
  getRecorridoContenidoForDesarrollo,
} from "@/lib/catalog/service";
import { resolveMasterPlanDocumento } from "@/lib/admin/documentos-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId")?.trim();

  if (!desarrolloId) {
    return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
  }

  const [desarrollo, clusters, prototipos, recorridoContenido, masterPlanDocumento] =
    await Promise.all([
      getDesarrolloById(desarrolloId),
      getClustersForDesarrollo(desarrolloId),
      getPrototiposForDesarrollo(desarrolloId),
      getRecorridoContenidoForDesarrollo(desarrolloId),
      resolveMasterPlanDocumento(desarrolloId),
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
    masterPlanPdf: masterPlanDocumento
      ? {
          url: masterPlanDocumento.public_url,
          nombre: masterPlanDocumento.nombre,
          filename: masterPlanDocumento.nombre_archivo,
        }
      : null,
  });
}
