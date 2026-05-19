import { NextResponse } from "next/server";
import { resolveDocumentoOficial } from "@/lib/admin/documentos-service";
import type { DocumentoTipo } from "@/lib/admin/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId");
  const clusterId = searchParams.get("clusterId") ?? undefined;
  const tipo = searchParams.get("tipo") as DocumentoTipo | null;

  if (!desarrolloId || !tipo) {
    return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
  }

  const documento = await resolveDocumentoOficial({
    desarrolloId,
    clusterId,
    etapa: searchParams.get("etapa") ?? undefined,
    prototipoId: searchParams.get("prototipoId") ?? undefined,
    tipo,
  });

  if (!documento) {
    return NextResponse.json({ url: null });
  }

  return NextResponse.json({
    url: documento.public_url,
    filename: documento.nombre_archivo,
    nombre: documento.nombre,
  });
}
