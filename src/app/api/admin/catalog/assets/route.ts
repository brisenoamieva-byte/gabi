import { NextResponse } from "next/server";
import { assertDesarrolloAccess, canAccessModule } from "@/lib/admin/permissions";
import {
  CATALOG_ASSET_KINDS,
  uploadCatalogAsset,
  type CatalogAssetKind,
} from "@/lib/admin/catalog-assets-store";
import { getAdminSession } from "@/lib/admin/session";

const GUION_KINDS = new Set<CatalogAssetKind>([
  "recorrido-desarrollador-logo",
  "recorrido-overview-logo",
  "recorrido-master-plan",
  "hub-hero",
]);

const CATALOGO_KINDS = new Set<CatalogAssetKind>([
  "desarrollo-logo",
  "desarrollo-desarrollador-logo",
  "comercializadora-logo",
]);

const PRODUCTO_KINDS = new Set<CatalogAssetKind>([
  "cluster-logo",
  "cluster-portada",
  "prototipo-foto",
  "prototipo-plano",
]);

const assertProductoAssetAccess = (
  profile: Parameters<typeof assertDesarrolloAccess>[0],
  desarrolloId: string,
) => {
  if (!canAccessModule(profile, "catalogo") && !canAccessModule(profile, "guion")) {
    throw new Error("Sin permiso.");
  }
  assertDesarrolloAccess(profile, desarrolloId);
};

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "").trim() as CatalogAssetKind;
    const desarrolloId = String(form.get("desarrolloId") ?? "").trim() || null;
    const comercializadoraId = String(form.get("comercializadoraId") ?? "").trim() || null;
    const clusterId = String(form.get("clusterId") ?? "").trim() || null;
    const prototipoId = String(form.get("prototipoId") ?? "").trim() || null;

    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
    }

    if (!CATALOG_ASSET_KINDS.includes(kind)) {
      return NextResponse.json({ error: "Tipo de imagen inválido." }, { status: 400 });
    }

    if (GUION_KINDS.has(kind)) {
      if (!canAccessModule(session.profile, "guion")) {
        return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
      }
      if (!desarrolloId) {
        return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
      }
      assertDesarrolloAccess(session.profile, desarrolloId);
    } else if (CATALOGO_KINDS.has(kind)) {
      if (!canAccessModule(session.profile, "catalogo")) {
        return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
      }
      if (kind === "comercializadora-logo" && !comercializadoraId) {
        return NextResponse.json({ error: "comercializadoraId requerido." }, { status: 400 });
      }
      if (kind !== "comercializadora-logo" && !desarrolloId) {
        return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
      }
      if (desarrolloId) {
        assertDesarrolloAccess(session.profile, desarrolloId);
      }
    } else if (PRODUCTO_KINDS.has(kind)) {
      if (!desarrolloId) {
        return NextResponse.json({ error: "desarrolloId requerido." }, { status: 400 });
      }
      assertProductoAssetAccess(session.profile, desarrolloId);
      if (kind.startsWith("cluster-") && !clusterId) {
        return NextResponse.json({ error: "clusterId requerido." }, { status: 400 });
      }
      if (kind.startsWith("prototipo-") && !prototipoId) {
        return NextResponse.json({ error: "prototipoId requerido." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Tipo de imagen inválido." }, { status: 400 });
    }

    const publicUrl = await uploadCatalogAsset({
      file,
      kind,
      desarrolloId,
      comercializadoraId,
      clusterId,
      prototipoId,
    });

    return NextResponse.json({ publicUrl, kind });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al subir imagen" },
      { status: error instanceof Error && error.message.includes("permiso") ? 403 : 400 },
    );
  }
}
