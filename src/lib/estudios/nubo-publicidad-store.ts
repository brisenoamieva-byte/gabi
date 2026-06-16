import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { normalizeNuboUbicacionMarcadores } from "@/lib/estudios/nubo-ubicacion-markers";
import {
  getDefaultNuboEstudioContenido,
  getDefaultNuboEstudioMedia,
} from "@/lib/estudios/nubo-estudio-defaults";
import type {
  NuboEstudioContenido,
  NuboEstudioMedia,
  NuboEstudioPublishMeta,
} from "@/lib/estudios/nubo-estudio-types";
import {
  NUBO_PUBLICIDAD_PARTIDAS_MENSUAL,
  type NuboPublicidadPartidaMensual,
} from "@/lib/estudios/nubo-publicidad-partidas";

function parseJsonField<T extends object>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === "object" && parsed !== null ? (parsed as T) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as T;
  return null;
}

const ROW_ID = "activo";
const MESES_COUNT = 12;
const ESTUDIOS_BUCKET = "gabi-estudios";

type NuboEstudioRow = {
  partidas: NuboPublicidadPartidaMensual[];
  contenido: NuboEstudioContenido | null;
  media: NuboEstudioMedia | null;
  updated_at: string;
};

export type NuboPublicidadPublishMeta = NuboEstudioPublishMeta & {
  partidasCount: number;
};

export type NuboPublicidadPublished = {
  partidas: NuboPublicidadPartidaMensual[];
  meta: NuboPublicidadPublishMeta;
};

export type NuboContenidoPublished = {
  contenido: NuboEstudioContenido;
  media: NuboEstudioMedia;
  meta: NuboEstudioPublishMeta;
};

function staticPartidas(): NuboPublicidadPartidaMensual[] {
  return NUBO_PUBLICIDAD_PARTIDAS_MENSUAL.map((p) => ({
    ...p,
    meses: [...p.meses],
  }));
}

function normalizePartidas(raw: NuboPublicidadPartidaMensual[]): NuboPublicidadPartidaMensual[] {
  return raw.map((p) => {
    const meses = Array.from({ length: MESES_COUNT }, (_, i) =>
      Math.max(0, Number(p.meses?.[i]) || 0),
    );
    return {
      proveedor: String(p.proveedor ?? "").trim(),
      concepto: String(p.concepto ?? "").trim(),
      segmento: String(p.segmento ?? "").trim(),
      meses,
      anual: meses.reduce((sum, m) => sum + m, 0),
    };
  });
}

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function normalizeContenido(raw: Partial<NuboEstudioContenido>): NuboEstudioContenido {
  const base = getDefaultNuboEstudioContenido();
  return {
    meta: { ...base.meta, ...raw.meta },
    diagnostico: { ...base.diagnostico, ...raw.diagnostico },
    condiciones:
      raw.condiciones?.length ?
        raw.condiciones.map((c, i) => ({
          num: String(c.num ?? base.condiciones[i]?.num ?? "").trim(),
          titulo: String(c.titulo ?? "").trim(),
          detalle: String(c.detalle ?? "").trim(),
        }))
      : base.condiciones,
    planos: { ...base.planos, ...raw.planos },
    accesos: {
      ...base.accesos,
      ...raw.accesos,
      paraArrancar: normalizeStringList(raw.accesos?.paraArrancar ?? base.accesos.paraArrancar),
    },
    hotel: {
      ...base.hotel,
      ...raw.hotel,
      paraArrancar: normalizeStringList(raw.hotel?.paraArrancar ?? base.hotel.paraArrancar),
    },
    restaurante: {
      ...base.restaurante,
      ...raw.restaurante,
      paraArrancar: normalizeStringList(
        raw.restaurante?.paraArrancar ?? base.restaurante.paraArrancar,
      ),
      referenciasConcepto:
        raw.restaurante?.referenciasConcepto?.length ?
          raw.restaurante.referenciasConcepto.map((r, i) => ({
            nombre: String(r.nombre ?? base.restaurante.referenciasConcepto[i]?.nombre ?? "").trim(),
            detalle: String(r.detalle ?? "").trim(),
          }))
        : base.restaurante.referenciasConcepto,
    },
  };
}

function normalizeMediaRef(
  raw: Partial<NuboEstudioMedia["accesosRef"][number]> | undefined,
  fallback: NuboEstudioMedia["accesosRef"][number],
): NuboEstudioMedia["accesosRef"][number] {
  return {
    src: String(raw?.src ?? fallback.src).trim(),
    nombre: String(raw?.nombre ?? fallback.nombre).trim(),
    detalle: String(raw?.detalle ?? fallback.detalle).trim(),
  };
}

function normalizeMedia(raw: Partial<NuboEstudioMedia>): NuboEstudioMedia {
  const base = getDefaultNuboEstudioMedia();
  return {
    ubicacionSitio: String(raw.ubicacionSitio ?? base.ubicacionSitio).trim(),
    ubicacionMarcadores: normalizeNuboUbicacionMarcadores(
      raw.ubicacionMarcadores ?? base.ubicacionMarcadores,
    ),
    hotelTaboadaActual: String(raw.hotelTaboadaActual ?? base.hotelTaboadaActual).trim(),
    accesosRef: base.accesosRef.map((ref, i) =>
      normalizeMediaRef(raw.accesosRef?.[i], ref),
    ),
    restauranteLookAndFeel: base.restauranteLookAndFeel.map((ref, i) =>
      normalizeMediaRef(raw.restauranteLookAndFeel?.[i], ref),
    ),
  };
}

export function validateNuboPublicidadPartidas(partidas: unknown): string | null {
  if (!Array.isArray(partidas) || partidas.length === 0) {
    return "Se requiere al menos una partida.";
  }

  for (let i = 0; i < partidas.length; i++) {
    const p = partidas[i] as Partial<NuboPublicidadPartidaMensual>;
    if (!p.proveedor?.trim()) return `Fila ${i + 1}: proveedor requerido.`;
    if (!p.concepto?.trim()) return `Fila ${i + 1}: concepto requerido.`;
    if (!p.segmento?.trim()) return `Fila ${i + 1}: segmento requerido.`;
    if (!Array.isArray(p.meses) || p.meses.length !== MESES_COUNT) {
      return `Fila ${i + 1}: deben ser ${MESES_COUNT} meses.`;
    }
    for (const m of p.meses) {
      if (typeof m !== "number" || Number.isNaN(m) || m < 0) {
        return `Fila ${i + 1}: montos mensuales inválidos.`;
      }
    }
  }

  return null;
}

async function readRow(): Promise<NuboEstudioRow | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("nubo_estudio_publicidad")
    .select("partidas, contenido, media, updated_at")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (!error && data) return data as NuboEstudioRow;

  if (error && /contenido|media|42703|column/i.test(error.message)) {
    const fallback = await supabase
      .from("nubo_estudio_publicidad")
      .select("partidas, updated_at")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (fallback.data) {
      return {
        partidas: fallback.data.partidas as NuboPublicidadPartidaMensual[],
        contenido: null,
        media: null,
        updated_at: fallback.data.updated_at as string,
      };
    }
  }

  return null;
}

export function getNuboEstudioStorageError(): string | null {
  if (!createSupabaseServiceClient()) {
    return "Supabase no configurado en el servidor (SUPABASE_SERVICE_ROLE_KEY). Los textos no se pueden publicar.";
  }
  return null;
}

async function upsertRow(
  patch: Partial<Pick<NuboEstudioRow, "partidas" | "contenido" | "media">>,
  adminProfileId: string | null,
): Promise<string> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error(
      "Supabase no configurado. Aplica las migraciones 029–031 y define SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const current = await readRow();
  const now = new Date().toISOString();
  const selectFields = "contenido, media, updated_at, partidas";

  const migrationError = (message: string) => {
    if (/contenido|media|42703|column/i.test(message)) {
      throw new Error(
        "Falta la migración 030_nubo_estudio_contenido.sql en Supabase (columnas contenido/media).",
      );
    }
    throw new Error(message);
  };

  if (!current) {
    const { data, error } = await supabase
      .from("nubo_estudio_publicidad")
      .insert({
        id: ROW_ID,
        partidas: patch.partidas ?? staticPartidas(),
        contenido: patch.contenido ?? null,
        media: patch.media ?? null,
        updated_at: now,
        updated_by: adminProfileId,
      })
      .select(selectFields)
      .single();

    if (error) migrationError(error.message);
    return verifyUpsertPatch(patch, data, now);
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: now,
    updated_by: adminProfileId,
  };
  if (patch.partidas !== undefined) updatePayload.partidas = patch.partidas;
  if (patch.contenido !== undefined) updatePayload.contenido = patch.contenido;
  if (patch.media !== undefined) updatePayload.media = patch.media;

  const { data, error } = await supabase
    .from("nubo_estudio_publicidad")
    .update(updatePayload)
    .eq("id", ROW_ID)
    .select(selectFields)
    .single();

  if (error) migrationError(error.message);

  return verifyUpsertPatch(patch, data, now);
}

function verifyUpsertPatch(
  patch: Partial<Pick<NuboEstudioRow, "partidas" | "contenido" | "media">>,
  data: Record<string, unknown> | null,
  now: string,
): string {
  if (patch.contenido !== undefined && !parseJsonField<NuboEstudioContenido>(data?.contenido)) {
    throw new Error(
      "Supabase no guardó la columna contenido. Verifica migración 030 y permisos del service role.",
    );
  }

  if (patch.media !== undefined && !parseJsonField<NuboEstudioMedia>(data?.media)) {
    throw new Error(
      "Supabase no guardó la columna media. Verifica migración 030 y permisos del service role.",
    );
  }

  return (data?.updated_at as string) ?? now;
}

export async function getPublishedNuboPublicidad(): Promise<NuboPublicidadPublished> {
  const row = await readRow();

  if (row?.partidas && Array.isArray(row.partidas)) {
    const partidas = normalizePartidas(row.partidas as NuboPublicidadPartidaMensual[]);
    return {
      partidas,
      meta: {
        updatedAt: row.updated_at,
        origin: "supabase",
        partidasCount: partidas.length,
      },
    };
  }

  const partidas = staticPartidas();
  return {
    partidas,
    meta: {
      updatedAt: new Date(0).toISOString(),
      origin: "static",
      partidasCount: partidas.length,
    },
  };
}

export async function getPublishedNuboContenido(): Promise<NuboContenidoPublished> {
  const row = await readRow();
  const defaultContenido = getDefaultNuboEstudioContenido();
  const defaultMedia = getDefaultNuboEstudioMedia();

  if (!row) {
    return {
      contenido: defaultContenido,
      media: defaultMedia,
      meta: {
        updatedAt: new Date(0).toISOString(),
        origin: "static",
        contenidoPublicado: false,
        mediaPublicado: false,
      },
    };
  }

  const parsedContenido = parseJsonField<NuboEstudioContenido>(row.contenido);
  const parsedMedia = parseJsonField<NuboEstudioMedia>(row.media);
  const contenidoPublicado = parsedContenido !== null;
  const mediaPublicado = parsedMedia !== null;

  return {
    contenido: contenidoPublicado ? normalizeContenido(parsedContenido) : defaultContenido,
    media: mediaPublicado ? normalizeMedia(parsedMedia) : defaultMedia,
    meta: {
      updatedAt: row.updated_at,
      origin: contenidoPublicado || mediaPublicado ? "supabase" : "static",
      contenidoPublicado,
      mediaPublicado,
    },
  };
}

export async function publishNuboPublicidadPartidas(
  partidasInput: NuboPublicidadPartidaMensual[],
  adminProfileId: string | null,
): Promise<NuboPublicidadPublishMeta> {
  const validation = validateNuboPublicidadPartidas(partidasInput);
  if (validation) throw new Error(validation);

  const partidas = normalizePartidas(partidasInput);
  const updatedAt = await upsertRow({ partidas }, adminProfileId);

  return {
    updatedAt,
    origin: "supabase",
    partidasCount: partidas.length,
  };
}

export async function resetNuboPublicidadToStatic(
  adminProfileId: string | null,
): Promise<NuboPublicidadPublishMeta> {
  return publishNuboPublicidadPartidas(staticPartidas(), adminProfileId);
}

export async function publishNuboEstudioContenido(
  contenidoInput: NuboEstudioContenido,
  adminProfileId: string | null,
): Promise<NuboContenidoPublished> {
  const contenido = normalizeContenido(contenidoInput);
  const updatedAt = await upsertRow({ contenido }, adminProfileId);
  const row = await readRow();
  const defaultMedia = getDefaultNuboEstudioMedia();

  return {
    contenido,
    media: normalizeMedia((row?.media ?? defaultMedia) as NuboEstudioMedia),
    meta: {
      updatedAt,
      origin: "supabase",
      contenidoPublicado: true,
      mediaPublicado: parseJsonField<NuboEstudioMedia>(row?.media) !== null,
    },
  };
}

export async function publishNuboEstudioMedia(
  mediaInput: NuboEstudioMedia,
  adminProfileId: string | null,
): Promise<NuboContenidoPublished> {
  const media = normalizeMedia(mediaInput);
  const updatedAt = await upsertRow({ media }, adminProfileId);
  const row = await readRow();
  const defaultContenido = getDefaultNuboEstudioContenido();

  return {
    contenido: normalizeContenido((row?.contenido ?? defaultContenido) as NuboEstudioContenido),
    media,
    meta: {
      updatedAt,
      origin: "supabase",
      contenidoPublicado: parseJsonField<NuboEstudioContenido>(row?.contenido) !== null,
      mediaPublicado: true,
    },
  };
}

export async function resetNuboEstudioContenidoToStatic(
  adminProfileId: string | null,
): Promise<NuboContenidoPublished> {
  await upsertRow({ contenido: getDefaultNuboEstudioContenido() }, adminProfileId);
  return getPublishedNuboContenido();
}

export async function resetNuboEstudioMediaToStatic(
  adminProfileId: string | null,
): Promise<NuboContenidoPublished> {
  await upsertRow({ media: getDefaultNuboEstudioMedia() }, adminProfileId);
  return getPublishedNuboContenido();
}

export async function resetNuboEstudioAllToStatic(
  adminProfileId: string | null,
): Promise<NuboContenidoPublished> {
  await upsertRow(
    {
      contenido: getDefaultNuboEstudioContenido(),
      media: getDefaultNuboEstudioMedia(),
    },
    adminProfileId,
  );
  return getPublishedNuboContenido();
}

export async function uploadNuboEstudioImagen(input: {
  file: File;
  slot: string;
  adminProfileId: string | null;
}): Promise<string> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const ext = input.file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeSlot = input.slot.replace(/[^a-zA-Z0-9-_]/g, "-");
  const path = `nubo/${safeSlot}-${Date.now()}.${ext}`;

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const { error } = await supabase.storage.from(ESTUDIOS_BUCKET).upload(path, buffer, {
    contentType: input.file.type || "image/jpeg",
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(ESTUDIOS_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("No se pudo obtener la URL pública.");
  return data.publicUrl;
}
