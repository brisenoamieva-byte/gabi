import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const CATALOG_ASSETS_BUCKET = "gabi-assets";

export const CATALOG_ASSET_KINDS = [
  "desarrollo-logo",
  "desarrollo-desarrollador-logo",
  "comercializadora-logo",
  "recorrido-desarrollador-logo",
  "recorrido-overview-logo",
  "recorrido-master-plan",
  "hub-hero",
  "cluster-logo",
  "cluster-portada",
  "prototipo-foto",
  "prototipo-plano",
] as const;

export type CatalogAssetKind = (typeof CATALOG_ASSET_KINDS)[number];

const MAX_BYTES = 15 * 1024 * 1024;

const safeSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

export async function uploadCatalogAsset(input: {
  file: File;
  kind: CatalogAssetKind;
  desarrolloId?: string | null;
  comercializadoraId?: string | null;
  clusterId?: string | null;
  prototipoId?: string | null;
}): Promise<string> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  if (!input.file.size) {
    throw new Error("Archivo vacío.");
  }

  if (input.file.size > MAX_BYTES) {
    throw new Error("La imagen no puede superar 15 MB.");
  }

  if (!input.file.type.startsWith("image/")) {
    throw new Error("Solo se permiten imágenes (JPG, PNG, WebP, GIF, SVG).");
  }

  const ext = input.file.name.split(".").pop()?.toLowerCase() || "jpg";
  const kind = safeSegment(input.kind);
  const scope = input.prototipoId
    ? `desarrollos/${safeSegment(input.desarrolloId ?? "general")}/prototipos/${safeSegment(input.prototipoId)}`
    : input.clusterId
      ? `desarrollos/${safeSegment(input.desarrolloId ?? "general")}/clusters/${safeSegment(input.clusterId)}`
      : input.desarrolloId
        ? `desarrollos/${safeSegment(input.desarrolloId)}`
        : input.comercializadoraId
          ? `comercializadoras/${safeSegment(input.comercializadoraId)}`
          : "general";

  const path = `${scope}/${kind}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());

  const { error } = await supabase.storage.from(CATALOG_ASSETS_BUCKET).upload(path, buffer, {
    contentType: input.file.type || "image/jpeg",
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(CATALOG_ASSETS_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("No se pudo obtener la URL pública.");
  }

  return data.publicUrl;
}
