import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { INVESTTI_SIMULADOR_CONFIG } from "@/lib/corredor/investti-simulador-config.generated";
import type {
  InvesttiDesarrolloReglas,
  InvesttiSimuladorConfigData,
  InvesttiSimuladorPayload,
  InvesttiSimuladorPublishMeta,
} from "@/lib/corredor/investti-simulador-data-types";
import staticPayload from "../../../public/data/investti-simulador-lotes.json";

const ROW_ID = "activo";

function configFromGenerated(): InvesttiSimuladorConfigData {
  const c = INVESTTI_SIMULADOR_CONFIG;
  return {
    generatedAt: c.generatedAt,
    source: c.source,
    interestAnual: c.interestAnual,
    apartadoDefault: c.apartadoDefault,
    descuentosEsquemaPct: { ...c.descuentosEsquemaPct },
    esquemas: c.esquemas.map((e) => ({ ...e })),
    desarrolloSlug: { ...c.desarrolloSlug },
    slugDesarrollo: { ...c.slugDesarrollo },
    stats: c.stats ? { lotes: c.stats.lotes, byDev: { ...c.stats.byDev } } : undefined,
    reglas: Object.fromEntries(
      Object.entries(c.reglas).map(([k, v]) => [k, { ...v }]),
    ),
  };
}

function configFromPayload(payload: InvesttiSimuladorPayload): InvesttiSimuladorConfigData {
  return {
    generatedAt: payload.generatedAt,
    source: payload.source,
    interestAnual: payload.interestAnual,
    apartadoDefault: payload.apartadoDefault,
    descuentosEsquemaPct: payload.descuentosEsquemaPct,
    esquemas: payload.esquemas,
    desarrolloSlug: payload.desarrolloSlug,
    slugDesarrollo: payload.slugDesarrollo,
    stats: payload.stats,
    reglas: payload.reglas,
  };
}

function staticFallbackPayload(): InvesttiSimuladorPayload {
  const raw = staticPayload as InvesttiSimuladorPayload & { reglas?: Record<string, InvesttiDesarrolloReglas> };
  const generated = configFromGenerated();
  return {
    ...raw,
    reglas: raw.reglas ?? generated.reglas,
    slugDesarrollo:
      raw.slugDesarrollo ??
      Object.fromEntries(Object.entries(raw.desarrolloSlug ?? generated.desarrolloSlug).map(([k, v]) => [v, k])),
    stats: raw.stats ?? generated.stats ?? { lotes: raw.lotes.length, byDev: {} },
  };
}

export type InvesttiSimuladorPublished = {
  config: InvesttiSimuladorConfigData;
  lotes: InvesttiSimuladorPayload["lotes"];
  meta: InvesttiSimuladorPublishMeta;
};

export async function getPublishedInvesttiSimulador(): Promise<InvesttiSimuladorPublished> {
  const supabase = createSupabaseServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("investti_simulador_datos")
      .select("source, generated_at, config, lotes, updated_at")
      .eq("id", ROW_ID)
      .maybeSingle();

    if (!error && data?.config && data.lotes) {
      const config = data.config as InvesttiSimuladorConfigData;
      const lotes = data.lotes as InvesttiSimuladorPayload["lotes"];
      const byDev = config.stats?.byDev ?? {};
      return {
        config,
        lotes,
        meta: {
          source: data.source,
          generatedAt: data.generated_at,
          updatedAt: data.updated_at,
          origin: "supabase",
          stats: {
            lotes: lotes.length,
            byDev,
          },
        },
      };
    }
  }

  const fallback = staticFallbackPayload();
  return {
    config: configFromPayload(fallback),
    lotes: fallback.lotes,
    meta: {
      source: fallback.source,
      generatedAt: fallback.generatedAt,
      updatedAt: fallback.generatedAt,
      origin: "static",
      stats: fallback.stats ?? { lotes: fallback.lotes.length, byDev: {} },
    },
  };
}

export async function publishInvesttiSimulador(
  payload: InvesttiSimuladorPayload,
  adminProfileId: string,
): Promise<InvesttiSimuladorPublishMeta> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error(
      "Supabase no configurado. Aplica la migración 028_investti_simulador.sql y define SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const config = configFromPayload(payload);
  const now = new Date().toISOString();

  const { error } = await supabase.from("investti_simulador_datos").upsert({
    id: ROW_ID,
    source: payload.source,
    generated_at: payload.generatedAt,
    config,
    lotes: payload.lotes,
    updated_at: now,
    updated_by: adminProfileId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    source: payload.source,
    generatedAt: payload.generatedAt,
    updatedAt: now,
    origin: "supabase",
    stats: payload.stats ?? { lotes: payload.lotes.length, byDev: {} },
  };
}

export async function patchInvesttiSimuladorReglas(
  reglas: Record<string, InvesttiDesarrolloReglas>,
  adminProfileId: string,
): Promise<InvesttiSimuladorPublishMeta> {
  const current = await getPublishedInvesttiSimulador();
  const config: InvesttiSimuladorConfigData = {
    ...current.config,
    reglas: { ...current.config.reglas, ...reglas },
    generatedAt: new Date().toISOString(),
  };

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("investti_simulador_datos").upsert({
    id: ROW_ID,
    source: current.meta.source,
    generated_at: config.generatedAt,
    config,
    lotes: current.lotes,
    updated_at: now,
    updated_by: adminProfileId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    source: current.meta.source,
    generatedAt: config.generatedAt,
    updatedAt: now,
    origin: "supabase",
    stats: current.meta.stats,
  };
}
