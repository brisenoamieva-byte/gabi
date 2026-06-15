import { createSupabaseServiceClient } from "@/lib/supabase/server";
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

  if (error || !data) return null;
  return data as NuboEstudioRow;
}

async function upsertRow(
  patch: Partial<Pick<NuboEstudioRow, "partidas" | "contenido" | "media">>,
  adminProfileId: string,
): Promise<string> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error(
      "Supabase no configurado. Aplica las migraciones 029–031 y define SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const current = await readRow();
  const now = new Date().toISOString();

  const { error } = await supabase.from("nubo_estudio_publicidad").upsert({
    id: ROW_ID,
    partidas: patch.partidas ?? current?.partidas ?? staticPartidas(),
    contenido: patch.contenido ?? current?.contenido ?? null,
    media: patch.media ?? current?.media ?? null,
    updated_at: now,
    updated_by: adminProfileId,
  });

  if (error) throw new Error(error.message);
  return now;
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

  if (row && (row.contenido || row.media)) {
    return {
      contenido: normalizeContenido((row.contenido ?? defaultContenido) as NuboEstudioContenido),
      media: normalizeMedia((row.media ?? defaultMedia) as NuboEstudioMedia),
      meta: {
        updatedAt: row.updated_at,
        origin: "supabase",
      },
    };
  }

  return {
    contenido: defaultContenido,
    media: defaultMedia,
    meta: {
      updatedAt: new Date(0).toISOString(),
      origin: "static",
    },
  };
}

export async function publishNuboPublicidadPartidas(
  partidasInput: NuboPublicidadPartidaMensual[],
  adminProfileId: string,
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
  adminProfileId: string,
): Promise<NuboPublicidadPublishMeta> {
  return publishNuboPublicidadPartidas(staticPartidas(), adminProfileId);
}

export async function publishNuboEstudioContenido(
  contenidoInput: NuboEstudioContenido,
  adminProfileId: string,
): Promise<NuboEstudioPublishMeta> {
  const contenido = normalizeContenido(contenidoInput);
  const updatedAt = await upsertRow({ contenido }, adminProfileId);
  return { updatedAt, origin: "supabase" };
}

export async function publishNuboEstudioMedia(
  mediaInput: NuboEstudioMedia,
  adminProfileId: string,
): Promise<NuboEstudioPublishMeta> {
  const media = normalizeMedia(mediaInput);
  const updatedAt = await upsertRow({ media }, adminProfileId);
  return { updatedAt, origin: "supabase" };
}

export async function resetNuboEstudioContenidoToStatic(
  adminProfileId: string,
): Promise<NuboContenidoPublished> {
  await upsertRow({ contenido: getDefaultNuboEstudioContenido() }, adminProfileId);
  return getPublishedNuboContenido();
}

export async function resetNuboEstudioMediaToStatic(
  adminProfileId: string,
): Promise<NuboContenidoPublished> {
  await upsertRow({ media: getDefaultNuboEstudioMedia() }, adminProfileId);
  return getPublishedNuboContenido();
}

export async function resetNuboEstudioAllToStatic(
  adminProfileId: string,
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
  adminProfileId: string;
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
