import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  generateShareCode,
  generateShareToken,
  hashShareCode,
  verifyShareCode,
} from "@/lib/propuestas/share-code";
import { expiryFromPreset } from "@/lib/propuestas/share-constants";

export { expiryFromPreset, SHARE_EXPIRY_PRESETS, type ShareExpiryPresetId } from "@/lib/propuestas/share-constants";

export type PropuestaAccesoRecord = {
  id: string;
  propuesta_slug: string;
  token: string;
  codigo_hash: string;
  activo: boolean;
  titulo_cliente: string | null;
  expires_at: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
};

export type PropuestaSharePublic = {
  token: string;
  propuestaSlug: string;
  tituloCliente: string | null;
  activo: boolean;
  expiresAt: string | null;
};

const TABLE = "propuesta_accesos";

const isExpired = (record: PropuestaAccesoRecord) => {
  if (!record.expires_at) return false;
  return new Date(record.expires_at).getTime() < Date.now();
};

export const getShareByToken = async (token: string): Promise<PropuestaAccesoRecord | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  const record = data as PropuestaAccesoRecord;
  if (!record.activo || isExpired(record)) return null;
  return record;
};

export const getActiveShareBySlug = async (
  slug: string,
): Promise<PropuestaAccesoRecord | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("propuesta_slug", slug)
    .eq("activo", true)
    .maybeSingle();

  if (error || !data) return null;
  const record = data as PropuestaAccesoRecord;
  if (isExpired(record)) return null;
  return record;
};

export const createShareAccess = async (input: {
  slug: string;
  operatorEmail: string;
  tituloCliente?: string;
  expiresAt?: string | null;
}) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Base de datos no configurada.");
  }

  const existing = await getActiveShareBySlug(input.slug);
  if (existing) {
    return {
      share: toPublicShare(existing),
      codigo: null as string | null,
      created: false,
    };
  }

  const codigo = generateShareCode();
  const token = generateShareToken();
  const now = new Date().toISOString();
  const expiresAt = input.expiresAt === undefined ? expiryFromPreset("30") : input.expiresAt;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      propuesta_slug: input.slug,
      token,
      codigo_hash: hashShareCode(codigo),
      activo: true,
      titulo_cliente: input.tituloCliente ?? null,
      expires_at: expiresAt,
      created_by_email: input.operatorEmail,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear el acceso.");
  }

  return {
    share: toPublicShare(data as PropuestaAccesoRecord),
    codigo,
    created: true,
  };
};

export const regenerateShareCode = async (input: {
  slug: string;
  operatorEmail: string;
}) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Base de datos no configurada.");
  }

  const existing = await getActiveShareBySlug(input.slug);
  if (!existing) {
    throw new Error("No hay enlace activo para esta propuesta.");
  }

  const codigo = generateShareCode();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      codigo_hash: hashShareCode(codigo),
      updated_at: now,
      created_by_email: input.operatorEmail,
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo regenerar el código.");
  }

  return {
    share: toPublicShare(data as PropuestaAccesoRecord),
    codigo,
  };
};

export const updateShareExpiry = async (input: {
  slug: string;
  operatorEmail: string;
  expiresAt: string | null;
}) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Base de datos no configurada.");
  }

  const existing = await getActiveShareBySlug(input.slug);
  if (!existing) {
    throw new Error("No hay enlace activo para esta propuesta.");
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      expires_at: input.expiresAt,
      updated_at: new Date().toISOString(),
      created_by_email: input.operatorEmail,
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo actualizar la vigencia.");
  }

  return { share: toPublicShare(data as PropuestaAccesoRecord) };
};

export const revokeShareAccess = async (slug: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Base de datos no configurada.");
  }

  const { error } = await supabase
    .from(TABLE)
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("propuesta_slug", slug)
    .eq("activo", true);

  if (error) {
    throw new Error(error.message);
  }
};

export const authenticateShareCode = async (token: string, codigo: string) => {
  const share = await getShareByToken(token);
  if (!share) return null;
  if (!verifyShareCode(codigo, share.codigo_hash)) return null;
  return share;
};

const toPublicShare = (record: PropuestaAccesoRecord): PropuestaSharePublic => ({
  token: record.token,
  propuestaSlug: record.propuesta_slug,
  tituloCliente: record.titulo_cliente,
  activo: record.activo,
  expiresAt: record.expires_at,
});

export const buildShareUrl = (token: string) => {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/propuestas/v/${token}`;
};
