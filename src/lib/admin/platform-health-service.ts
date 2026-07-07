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
  const qaWebhookSecretConfigured = Boolean(process.env.QA_WEBHOOK_SECRET?.trim());
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());
  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const emailFromConfigured = Boolean(process.env.EMAIL_FROM?.trim());

  if (!supabaseConfigured) {
    return {
      ok: false,
      supabaseConfigured: false,
      parseurSecretConfigured,
      qaWebhookSecretConfigured,
      cronSecretConfigured,
      resendConfigured,
      emailFromConfigured,
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

  const asesoresTelefonoOk = await probeTable("asesores", "telefono");
  checks.push({
    id: "036",
    label: "Teléfono en asesores",
    migrationFile: "036_asesores_telefono.sql",
    ok: asesoresTelefonoOk,
    detail: asesoresTelefonoOk
      ? "Contacto telefónico en equipo comercial."
      : "Falta asesores.telefono — aplica 036.",
  });

  const encuestasOk = await probeTable("prospecto_encuestas", "tipo");
  checks.push({
    id: "037",
    label: "Encuestas QA / Satisfacción",
    migrationFile: "037_prospecto_qa_satisfaccion.sql",
    ok: encuestasOk,
    detail: encuestasOk
      ? "Webhook ADRYO y reportes QA disponibles."
      : "Falta prospecto_encuestas — aplica 037.",
  });

  const playbookOk = await probeTable("crm_playbook_configs", "desarrollo_id");
  checks.push({
    id: "038",
    label: "Playbook CRM asesor",
    migrationFile: "038_crm_playbook.sql",
    ok: playbookOk,
    detail: playbookOk
      ? "Siguiente paso y bloqueo de etapa en desarrollos piloto."
      : "Falta crm_playbook_configs — aplica 038.",
  });

  const guardiasOk = await probeTable("guardia_asignaciones", "turno");
  checks.push({
    id: "039",
    label: "Calendario guardias oficina",
    migrationFile: "039_guardias_calendario.sql",
    ok: guardiasOk,
    detail: guardiasOk
      ? "Guardias matutino/vespertino por desarrollo."
      : "Falta guardia_asignaciones — aplica 039.",
  });

  checks.push({
    id: "040",
    label: "RLS encuestas prospecto",
    migrationFile: "040_prospecto_encuestas_rls.sql",
    ok: encuestasOk,
    detail: encuestasOk
      ? "Tabla prospecto_encuestas OK — aplica 040 en SQL Editor para RLS service_role."
      : "Falta prospecto_encuestas — aplica 037.",
  });

  const leadCarouselOk = await probeTable("lead_carousel_state", "desarrollo_id");
  checks.push({
    id: "041",
    label: "WhatsApp leads y carrusel guardia",
    migrationFile: "041_whatsapp_lead_notifications.sql",
    ok: leadCarouselOk,
    detail: leadCarouselOk
      ? "Notificaciones WhatsApp y carrusel de guardia disponibles."
      : "Falta lead_carousel_state — aplica 041.",
  });

  const complianceDigestOk = await probeTable("compliance_digest_log", "desarrollo_id");
  checks.push({
    id: "042",
    label: "Digest cumplimiento CRM",
    migrationFile: "042_crm_compliance_digest.sql",
    ok: complianceDigestOk,
    detail: complianceDigestOk
      ? "Log de digest de cumplimiento CRM activo."
      : "Falta compliance_digest_log — aplica 042.",
  });

  const complianceChannelOk = complianceDigestOk
    ? await probeTable("compliance_digest_log", "channel")
    : false;
  checks.push({
    id: "043",
    label: "Playbook Gavia + WhatsApp digest",
    migrationFile: "043_crm_compliance_gavia.sql",
    ok: complianceChannelOk && playbookOk,
    detail:
      complianceChannelOk && playbookOk
        ? "Canal whatsapp en digest y playbook Misión La Gavia."
        : "Aplica 043 para canal WhatsApp en digest y playbook Gavia.",
  });

  const guardiaMarcajesOk = await probeTable("guardia_marcajes", "id");
  checks.push({
    id: "044",
    label: "Marcajes guardia GPS",
    migrationFile: "044_guardia_marcajes.sql",
    ok: guardiaMarcajesOk,
    detail: guardiaMarcajesOk
      ? "Marcaje entrada/salida en caseta disponible."
      : "Falta guardia_marcajes — aplica 044.",
  });

  const cadenciaOk = await probeTable("prospecto_cadencia", "prospecto_id");
  checks.push({
    id: "045",
    label: "Cadencia de perfilamiento BBR",
    migrationFile: "045_cadencia_perfilamiento.sql",
    ok: cadenciaOk,
    detail: cadenciaOk
      ? "Motor de cadencia 8 días activo."
      : "Falta prospecto_cadencia — aplica 045.",
  });

  const visitaFechasOk = await probeColumn("prospectos", "visita_agendada_on", {
    desarrollo_id: desarrolloId,
    nombre: "__gabi_health_probe__",
    etapa: "nuevo",
    visita_agendada_on: "2026-01-01",
  });
  checks.push({
    id: "046",
    label: "Fechas de visita en prospectos",
    migrationFile: "046_prospecto_fechas_visita.sql",
    ok: visitaFechasOk,
    detail: visitaFechasOk
      ? "Fechas de visita agendada y realizada disponibles."
      : "Faltan visita_agendada_on / visita_realizada_on — aplica 046.",
  });

  const perfilamientoVisitaOk = await probeColumn("prospectos", "perfil_presupuesto_disponible", {
    desarrollo_id: desarrolloId,
    nombre: "__gabi_health_probe__",
    etapa: "nuevo",
    perfil_presupuesto_disponible: true,
  });
  checks.push({
    id: "048",
    label: "Perfilamiento post-visita en prospectos",
    migrationFile: "048_prospecto_perfilamiento_visita.sql",
    ok: perfilamientoVisitaOk,
    detail: perfilamientoVisitaOk
      ? "Cuestionario post-visita (4 preguntas) disponible."
      : "Faltan columnas perfil_* — aplica 048.",
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
    qaWebhookSecretConfigured,
    cronSecretConfigured,
    resendConfigured,
    emailFromConfigured,
    checks,
  };
};
