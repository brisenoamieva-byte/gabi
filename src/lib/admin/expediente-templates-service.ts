import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  findMissingTemplateTags,
  resolveExpedienteTemplatePath,
} from "@/lib/comercial/expediente-doc-generator";
import {
  getApartadoTemplateDefs,
  getExpedienteTemplateBaseDir,
  type ExpedienteTemplateDef,
} from "@/lib/comercial/expediente-template-map";
import { existsSync, readFileSync } from "node:fs";

const BUCKET = "gabi-documentos";

export const expedienteTemplateStoragePath = (desarrolloId: string, fileName: string) =>
  `templates/${desarrolloId}/${fileName}`;

export type ExpedienteTemplateStatus = ExpedienteTemplateDef & {
  source: "storage" | "public" | "missing";
  missingTags: string[];
  storagePath: string;
};

const downloadStorageTemplate = async (
  desarrolloId: string,
  fileName: string,
): Promise<Buffer | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }
  const path = expedienteTemplateStoragePath(desarrolloId, fileName);
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    return null;
  }
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
};

/** Storage primero; si no, archivo en public/documentos-templates. */
export const loadExpedienteTemplateBuffer = async (
  desarrolloId: string,
  fileName: string,
): Promise<{ buffer: Buffer; source: "storage" | "public" } | null> => {
  const fromStorage = await downloadStorageTemplate(desarrolloId, fileName);
  if (fromStorage) {
    return { buffer: fromStorage, source: "storage" };
  }

  const baseDir = getExpedienteTemplateBaseDir(desarrolloId);
  if (!baseDir) {
    return null;
  }
  const publicPath = resolveExpedienteTemplatePath(baseDir, fileName);
  if (!existsSync(publicPath)) {
    return null;
  }
  return { buffer: readFileSync(publicPath), source: "public" };
};

export const listExpedienteTemplateStatuses = async (
  desarrolloId: string,
): Promise<ExpedienteTemplateStatus[]> => {
  const defs = getApartadoTemplateDefs(desarrolloId);
  const results: ExpedienteTemplateStatus[] = [];

  for (const def of defs) {
    const loaded = await loadExpedienteTemplateBuffer(desarrolloId, def.fileName);
    const storagePath = expedienteTemplateStoragePath(desarrolloId, def.fileName);
    if (!loaded) {
      results.push({
        ...def,
        source: "missing",
        missingTags: [],
        storagePath,
      });
      continue;
    }
    results.push({
      ...def,
      source: loaded.source,
      missingTags: findMissingTemplateTags(loaded.buffer),
      storagePath,
    });
  }

  return results;
};

export const uploadExpedienteTemplate = async (input: {
  desarrolloId: string;
  fileName: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<{ path: string; missingTags: string[] }> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const defs = getApartadoTemplateDefs(input.desarrolloId);
  const allowed = defs.some((d) => d.fileName === input.fileName);
  if (!allowed) {
    throw new Error(`Plantilla no reconocida para este desarrollo: ${input.fileName}`);
  }

  const path = expedienteTemplateStoragePath(input.desarrolloId, input.fileName);
  const { error } = await supabase.storage.from(BUCKET).upload(path, input.buffer, {
    contentType:
      input.contentType ??
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    path,
    missingTags: findMissingTemplateTags(input.buffer),
  };
};
