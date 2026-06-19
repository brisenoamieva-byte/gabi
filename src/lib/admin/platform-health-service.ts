import type { PlatformHealth, PlatformHealthCheck } from "@/lib/admin/platform-health-types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type { PlatformHealth, PlatformHealthCheck } from "@/lib/admin/platform-health-types";

const probeColumn = async (
  table: string,
  column: string,
  sampleRow: Record<string, unknown>,
): Promise<boolean> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from(table).insert(sampleRow);
  if (!error) {
    await supabase.from(table).delete().eq("nombre", sampleRow.nombre as string);
    return true;
  }

  return !error.message.includes(column);
};

const probeTable = async (table: string, column = "id"): Promise<boolean> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from(table).select(column, { count: "exact", head: true });
  return !error;
};

export const getPlatformHealth = async (): Promise<PlatformHealth> => {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const parseurSecretConfigured = Boolean(process.env.PARSEUR_WEBHOOK_SECRET?.trim());

  if (!supabaseConfigured) {
    return {
      ok: false,
      supabaseConfigured: false,
      parseurSecretConfigured,
      checks: [
        {
          id: "supabase",
          label: "Supabase",
          migrationFile: ".env.local",
          ok: false,
          detail: "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
        },
      ],
    };
  }

  const desarrolloId = "la-vista-residencial";
  const checks: PlatformHealthCheck[] = [];

  const calificacionOk = await probeColumn("prospectos", "calificacion", {
    desarrollo_id: desarrolloId,
    nombre: "__gabi_health_probe__",
    etapa: "nuevo",
    calificacion: "Sin Calificar",
  });
  checks.push({
    id: "020",
    label: "Campos lead Xperience (calificación, iScore, spam)",
    migrationFile: "020_xperience_lead_fields.sql",
    ok: calificacionOk,
    detail: calificacionOk
      ? "Columnas CRM avanzado disponibles."
      : "Falta columna calificacion — aplica migración 020.",
  });

  const interesOk = await probeColumn("prospectos", "nivel_interes", {
    desarrollo_id: desarrolloId,
    nombre: "__gabi_health_probe__",
    etapa: "nuevo",
    nivel_interes: "bajo",
  });
  checks.push({
    id: "021",
    label: "Nivel de interés comercial",
    migrationFile: "021_prospecto_nivel_interes.sql",
    ok: interesOk,
    detail: interesOk
      ? "Campo nivel_interes disponible."
      : "Falta nivel_interes — aplica migración 021.",
  });

  const campanasOk = await probeTable("campanas");
  checks.push({
    id: "019",
    label: "Campañas y atribución",
    migrationFile: "019_campanas.sql",
    ok: campanasOk,
    detail: campanasOk ? "Tabla campanas OK." : "Falta tabla campanas — aplica 019.",
  });

  const expedienteOk = await probeTable("expediente_documentos");
  checks.push({
    id: "022",
    label: "Expedientes de venta",
    migrationFile: "022_expediente_ventas.sql",
    ok: expedienteOk,
    detail: expedienteOk
      ? "Módulo expedientes disponible." : "Falta expediente_documentos — aplica 022.",
  });

  const comisionTableOk = await probeTable("solicitudes_comision");
  let comisionSchemaOk = comisionTableOk;
  if (comisionTableOk) {
    const supabase = createSupabaseServiceClient();
    if (supabase) {
      const { error } = await supabase
        .from("solicitudes_comision")
        .select("precio_venta")
        .limit(1);
      comisionSchemaOk = !error;
    }
  }
  checks.push({
    id: "023",
    label: "Solicitudes de comisión",
    migrationFile: "023_expediente_comisiones.sql",
    ok: comisionTableOk && comisionSchemaOk,
    detail: !comisionTableOk
      ? "Falta solicitudes_comision — aplica 023."
      : comisionSchemaOk
        ? "Módulo comisiones disponible."
        : "Tabla con esquema antiguo — aplica 025_solicitudes_comision_align.sql.",
  });

  const capturaOk = await probeTable("lead_captura_logs");
  checks.push({
    id: "024",
    label: "Logs captura Parseur",
    migrationFile: "024_lead_captura_logs.sql",
    ok: capturaOk,
    detail: capturaOk
      ? "Auditoría de webhooks disponible." : "Falta lead_captura_logs — aplica 024.",
  });

  const propuestasOverridesOk = await probeTable("propuestas_overrides", "slug");
  checks.push({
    id: "033",
    label: "Overrides de propuestas comerciales",
    migrationFile: "033_propuestas_overrides.sql",
    ok: propuestasOverridesOk,
    detail: propuestasOverridesOk
      ? "Editor de propuestas disponible."
      : "Falta propuestas_overrides — aplica 033.",
  });

  const corredorOverridesOk = await probeTable("corredor_desarrollo_overrides", "desarrollo_id");
  checks.push({
    id: "034",
    label: "Overrides catálogo corredor",
    migrationFile: "034_corredor_overrides.sql",
    ok: corredorOverridesOk,
    detail: corredorOverridesOk
      ? "Editor corredor sur disponible."
      : "Falta corredor_desarrollo_overrides — aplica 034.",
  });

  const objetivosOk = await probeTable("comercial_objetivos_anuales");
  checks.push({
    id: "035",
    label: "Objetivos comerciales anuales",
    migrationFile: "035_comercial_objetivos_anuales.sql",
    ok: objetivosOk,
    detail: objetivosOk
      ? "Metas de reporte semanal en BD."
      : "Falta comercial_objetivos_anuales — aplica 035.",
  });

  await createSupabaseServiceClient()
    ?.from("prospectos")
    .delete()
    .eq("nombre", "__gabi_health_probe__");

  const migrationsOk = checks.every((item) => item.ok);

  return {
    ok: migrationsOk && parseurSecretConfigured,
    supabaseConfigured: true,
    parseurSecretConfigured,
    checks,
  };
};
