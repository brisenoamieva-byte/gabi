import { NextResponse } from "next/server";
import {
  assertDesarrolloAccess,
  canAccessModule,
} from "@/lib/admin/permissions";
import { listDocumentos, uploadDocumento } from "@/lib/admin/documentos-service";
import { getAdminSession } from "@/lib/admin/session";
import {
  deriveDocumentoTipo,
  type DocumentoAlcanceStorage,
  type DocumentoCategoria,
} from "@/lib/admin/documentos-scope";

export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "documentos")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desarrolloId = searchParams.get("desarrolloId") ?? undefined;

  try {
    const documentos = await listDocumentos(session.profile, desarrolloId);
    return NextResponse.json({ documentos });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!canAccessModule(session.profile, "documentos")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const desarrolloId = String(formData.get("desarrolloId") ?? "");
    const alcance = String(formData.get("alcance") ?? "") as DocumentoAlcanceStorage;
    const categoria = String(formData.get("categoria") ?? "") as DocumentoCategoria;
    const clusterIdRaw = formData.get("clusterId");
    const etapaRaw = formData.get("etapa");
    const prototipoIdRaw = formData.get("prototipoId");
    const nombre = String(formData.get("nombre") ?? "").trim();
    const confirmReplace = formData.get("confirmReplace") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo PDF requerido" }, { status: 400 });
    }

    if (!desarrolloId || !categoria || !nombre) {
      return NextResponse.json({ error: "Completa todos los campos" }, { status: 400 });
    }

    const esFichaTecnica = categoria === "ficha_tecnica";

    const prototipoId =
      esFichaTecnica && prototipoIdRaw && String(prototipoIdRaw) !== ""
        ? String(prototipoIdRaw)
        : null;

    const clusterId = esFichaTecnica
      ? clusterIdRaw && String(clusterIdRaw) !== ""
        ? String(clusterIdRaw)
        : null
      : alcance === "desarrollo"
        ? null
        : clusterIdRaw && String(clusterIdRaw) !== ""
          ? String(clusterIdRaw)
          : null;

    const etapa =
      !esFichaTecnica && alcance === "etapa" && etapaRaw && String(etapaRaw) !== ""
        ? String(etapaRaw)
        : null;

    if (esFichaTecnica) {
      if (!clusterId) {
        return NextResponse.json({ error: "Selecciona un cluster." }, { status: 400 });
      }
      if (!prototipoId) {
        return NextResponse.json({ error: "Selecciona un producto (prototipo)." }, { status: 400 });
      }
    } else {
      if (!alcance) {
        return NextResponse.json({ error: "Completa todos los campos" }, { status: 400 });
      }
      if (alcance !== "desarrollo" && !clusterId) {
        return NextResponse.json({ error: "Selecciona un cluster." }, { status: 400 });
      }
      if (alcance === "etapa" && !etapa) {
        return NextResponse.json({ error: "Selecciona una etapa." }, { status: 400 });
      }
    }

    const tipo = deriveDocumentoTipo(alcance || "cluster", categoria);

    assertDesarrolloAccess(session.profile, desarrolloId);

    const documento = await uploadDocumento({
      file,
      desarrolloId,
      clusterId,
      etapa,
      prototipoId,
      tipo,
      nombre,
      adminId: session.userId,
      confirmReplace,
    });

    return NextResponse.json({ documento });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "DOCUMENTO_ALREADY_EXISTS" &&
      "existing" in error
    ) {
      return NextResponse.json(
        {
          error: "DOCUMENTO_ALREADY_EXISTS",
          message:
            "Ya existe un documento activo para este alcance. Confirma si deseas reemplazarlo.",
          existing: error.existing,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al subir" },
      { status: 500 },
    );
  }
}
