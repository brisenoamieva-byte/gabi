import type { PlatformHealth, PlatformHealthCheck } from "@/lib/admin/platform-health-types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

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

  const partnersOk = await probeTable("partners");
  let partnerIdOk = partnersOk;
  if (partnersOk) {
    partnerIdOk = await probeColumn("prospectos", "partner_id", {
      desarrollo_id: desarrolloId,
      nombre: "__gabi_health_probe__",
      etapa: "nuevo",
    });
  }
  checks.push({
    id: "063",
    label: "Alianzas (inmobiliarias / asesores externos)",
    migrationFile: "063_partners.sql",
    ok: partnersOk && partnerIdOk,
    detail: !partnersOk
      ? "Falta tabla partners — aplica 063."
      : partnerIdOk
        ? "Catálogo de aliados y partner_id en prospectos OK."
        : "Falta columna prospectos.partner_id — aplica 063.",
  });

  const campoConfigOk = await probeTable("desarrollos_catalog", "campo_config");
  checks.push({
    id: "064",
    label: "Config de campo por desarrollo",
    migrationFile: "064_desarrollo_campo_config.sql",
    ok: campoConfigOk,
    detail: campoConfigOk
      ? "campo_config editable en admin (cotizador, bancarios, Drive)."
      : "Falta columna desarrollos_catalog.campo_config — aplica 064.",
  });

  const listasPreciosOk = await probeTable("listas_precios");
  checks.push({
    id: "065",
    label: "Listas de precios versionadas",
    migrationFile: "065_listas_precios.sql",
    ok: listasPreciosOk,
    detail: listasPreciosOk
      ? "Tablas listas_precios OK."
      : "Falta listas_precios — aplica 065.",
  });

  const origenCaptacionOk = await probeColumn("prospectos", "origen_captacion", {
    desarrollo_id: desarrolloId,
    nombre: "__gabi_health_probe__",
    etapa: "nuevo",
  });
  checks.push({
    id: "066",
    label: "Captación / perfil sembrado",
    migrationFile: "066_sembrado_captacion_perfil.sql",
    ok: origenCaptacionOk,
    detail: origenCaptacionOk
      ? "origen_captacion y perfil en prospectos OK."
      : "Falta origen_captacion — aplica 066.",
  });

  const partnersConvenioOk = await probeTable("partners", "convenio_storage_path");
  checks.push({
    id: "067",
    label: "Convenio digital (alianzas)",
    migrationFile: "067_partners_convenio.sql",
    ok: Boolean(partnersOk && partnersConvenioOk),
    detail: !partnersOk
      ? "Requiere 063 (partners) primero."
      : partnersConvenioOk
        ? "Columnas de convenio en partners OK."
        : "Falta convenio_storage_path — aplica 067.",
  });

  const ofertaDatosOk = await probeTable("operaciones_comerciales", "cliente_kyc");
  checks.push({
    id: "068",
    label: "Oferta / KYC en operaciones",
    migrationFile: "068_expediente_oferta_datos.sql",
    ok: ofertaDatosOk,
    detail: ofertaDatosOk
      ? "cliente_kyc y plan_pago en operaciones OK."
      : "Falta cliente_kyc/plan_pago — aplica 068.",
  });

  // 069: etapa cancelado — probe insert+delete (valida check constraint).
  let etapaCanceladoOk = false;
  {
    const supabase = createSupabaseServiceClient();
    if (supabase) {
      const probeNombre = `__gabi_probe_etapa_cancelado__`;
      const { data: probeRow, error: probeErr } = await supabase
        .from("prospectos")
        .insert({
          desarrollo_id: "mision-la-gavia",
          nombre: probeNombre,
          etapa: "cancelado",
          activo: false,
        })
        .select("id")
        .maybeSingle();

      if (!probeErr && probeRow?.id) {
        etapaCanceladoOk = true;
        await supabase.from("prospectos").delete().eq("id", probeRow.id);
      } else if (probeErr?.code === "23514") {
        etapaCanceladoOk = false;
      } else {
        // Desarrollo inexistente u otro error: fallback por filas pendientes de migrar.
        const { count } = await supabase
          .from("prospectos")
          .select("id", { count: "exact", head: true })
          .eq("etapa", "perdido")
          .or(
            "calificacion.eq.Descartado / Canceló apartado,notas.ilike.%[Apartó y canceló%",
          );
        const { count: cancelados } = await supabase
          .from("prospectos")
          .select("id", { count: "exact", head: true })
          .eq("etapa", "cancelado");
        etapaCanceladoOk = (count ?? 0) === 0 && (cancelados ?? 0) >= 0 && !probeErr?.message?.includes("schema");
        if ((count ?? 0) > 0) etapaCanceladoOk = false;
        if ((cancelados ?? 0) > 0) etapaCanceladoOk = true;
      }
    }
  }
  checks.push({
    id: "069",
    label: "Etapa CRM Cancelado",
    migrationFile: "069_etapa_cancelado.sql",
    ok: etapaCanceladoOk,
    detail: etapaCanceladoOk
      ? "Etapa cancelado disponible (distinta de Descartado)."
      : "Falta etapa cancelado — aplica 069.",
  });

  const canceladaEnEtapaOk = await probeTable("operaciones_comerciales", "cancelada_en_etapa");
  checks.push({
    id: "070",
    label: "Cancelación apartado vs venta",
    migrationFile: "070_cancelada_en_etapa.sql",
    ok: canceladaEnEtapaOk,
    detail: canceladaEnEtapaOk
      ? "cancelada_en_etapa en operaciones OK."
      : "Falta cancelada_en_etapa — aplica 070.",
  });

  const motivoDescarteOk = await probeTable("prospectos", "motivo_descarte");
  checks.push({
    id: "071",
    label: "Motivo de descarte CRM",
    migrationFile: "071_motivo_descarte.sql",
    ok: motivoDescarteOk,
    detail: motivoDescarteOk
      ? "motivo_descarte en prospectos OK."
      : "Falta motivo_descarte — aplica 071.",
  });

  // 072: etapa visita — probe insert+delete (valida check constraint).
  let etapaVisitaOk = false;
  {
    const supabase = createSupabaseServiceClient();
    if (supabase) {
      const probeNombre = `__gabi_probe_etapa_visita__`;
      const { data: probeRow, error: probeErr } = await supabase
        .from("prospectos")
        .insert({
          desarrollo_id: "mision-la-gavia",
          nombre: probeNombre,
          etapa: "visita",
          activo: false,
        })
        .select("id")
        .maybeSingle();

      if (!probeErr && probeRow?.id) {
        etapaVisitaOk = true;
        await supabase.from("prospectos").delete().eq("id", probeRow.id);
      } else if (probeErr?.code === "23514") {
        etapaVisitaOk = false;
      }
    }
  }
  checks.push({
    id: "072",
    label: "Etapa visita CRM",
    migrationFile: "072_etapa_visita.sql",
    ok: etapaVisitaOk,
    detail: etapaVisitaOk
      ? "Etapa visita en prospectos OK."
      : "Falta etapa visita — aplica 072.",
  });

  const proximoContactoOk = await probeTable("prospectos", "proximo_contacto_on");
  checks.push({
    id: "073",
    label: "Próximo contacto CRM",
    migrationFile: "073_proximo_contacto.sql",
    ok: proximoContactoOk,
    detail: proximoContactoOk
      ? "proximo_contacto_on en prospectos OK."
      : "Falta proximo_contacto_on — aplica 073.",
  });

  const visitaHoraOk = await probeTable("prospectos", "visita_agendada_hora");
  checks.push({
    id: "074",
    label: "Horario cita agendada",
    migrationFile: "074_visita_agendada_hora.sql",
    ok: visitaHoraOk,
    detail: visitaHoraOk
      ? "visita_agendada_hora en prospectos OK."
      : "Falta visita_agendada_hora — aplica 074.",
  });

  const descuentosEsquemaOk = await probeTable("listas_precios", "descuentos_esquema");
  checks.push({
    id: "075",
    label: "Descuentos por esquema (listas de precios)",
    migrationFile: "075_lista_precios_descuentos.sql",
    ok: descuentosEsquemaOk,
    detail: descuentosEsquemaOk
      ? "descuentos_esquema en listas_precios OK."
      : "Falta descuentos_esquema — aplica 075.",
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
      ? "Siguiente paso y bloqueo de etapa en playbook CRM."
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

  const pushSubsOk = await probeTable("asesor_push_subscriptions", "endpoint");
  checks.push({
    id: "080",
    label: "Web Push asesores (PWA)",
    migrationFile: "080_asesor_push_subscriptions.sql",
    ok: pushSubsOk,
    detail: pushSubsOk
      ? "Suscripciones push de asesores listas."
      : "Falta asesor_push_subscriptions — aplica 080.",
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

  const pasajeCasetaOk = await (async () => {
    const supabase = createSupabaseServiceClient();
    if (!supabase) {
      return false;
    }
    const { data, error } = await supabase
      .from("guardia_caseta_config")
      .select("desarrollo_id")
      .eq("desarrollo_id", "pasaje-alamos")
      .maybeSingle();
    return !error && Boolean(data);
  })();
  checks.push({
    id: "051",
    label: "Caseta GPS Pasaje Álamos",
    migrationFile: "051_guardia_caseta_pasaje_alamos.sql",
    ok: pasajeCasetaOk,
    detail: pasajeCasetaOk
      ? "Caseta Pasaje Álamos configurada para marcajes."
      : "Falta guardia_caseta_config pasaje-alamos — aplica 051.",
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
    label: "Perfilamiento del lead en prospectos",
    migrationFile: "048_prospecto_perfilamiento_visita.sql",
    ok: perfilamientoVisitaOk,
    detail: perfilamientoVisitaOk
      ? "Cuestionario de perfilamiento (4 preguntas) disponible."
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
