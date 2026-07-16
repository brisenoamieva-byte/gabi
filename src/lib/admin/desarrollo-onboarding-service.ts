import { canAccessDesarrollo } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import {
  hasCotizadorRulesConfig,
  hasDatosBancariosConfig,
  normalizeCampoConfig,
} from "@/lib/catalog/campo-config";
import {
  getSembradoSegmentsForDesarrollo,
  hasSegmentedReporteSemanal,
} from "@/lib/catalog/desarrollos-registry";
import {
  getGoogleDriveRootFolderIdFromEnv,
  hasGoogleDriveServiceAccount,
} from "@/lib/integrations/google-drive-config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type OnboardingCheck = {
  id: string;
  label: string;
  done: boolean;
  detail: string;
  /** Obligatorios para “listo para campo”. */
  required?: boolean;
  /** Ruta admin relativa para completar el paso. */
  href?: string;
};

export type DesarrolloOnboardingResult = {
  desarrolloId: string;
  anio: number;
  checks: OnboardingCheck[];
  progressPct: number;
  readyForField: boolean;
  /** Qué se arma en Gabi vs qué sigue requiriendo ingeniería. */
  selfServeNote: string;
};

export async function getDesarrolloOnboarding(
  desarrolloId: string,
  profile?: AdminProfile,
): Promise<DesarrolloOnboardingResult> {
  const supabase = createSupabaseServiceClient();
  const anio = new Date().getFullYear();

  if (profile && !canAccessDesarrollo(profile, desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  if (!supabase) {
    return {
      desarrolloId,
      anio,
      checks: [
        {
          id: "supabase",
          label: "Backend",
          done: false,
          detail: "Supabase no configurado.",
          required: true,
        },
      ],
      progressPct: 0,
      readyForField: false,
      selfServeNote: "Configura Supabase para operar desde el admin de Gabi.",
    };
  }

  const hubQs = `desarrollo=${encodeURIComponent(desarrolloId)}`;

  const [
    desarrolloRow,
    clustersCount,
    prototiposCount,
    unidadesCount,
    campanasCount,
    documentosCount,
    objetivosCount,
    asesoresCount,
    playbookCount,
  ] = await Promise.all([
    supabase
      .from("desarrollos_catalog")
      .select("id, recorrido_contenido, campo_config")
      .eq("id", desarrolloId)
      .maybeSingle(),
    supabase
      .from("clusters_catalog")
      .select("id", { count: "exact", head: true })
      .eq("desarrollo_id", desarrolloId),
    supabase
      .from("prototipos_catalog")
      .select("id", { count: "exact", head: true })
      .eq("desarrollo_id", desarrolloId),
    supabase
      .from("disponibilidad_unidades")
      .select("id", { count: "exact", head: true })
      .eq("desarrollo_id", desarrolloId)
      .eq("activo", true),
    supabase
      .from("campanas")
      .select("id", { count: "exact", head: true })
      .eq("desarrollo_id", desarrolloId)
      .eq("activo", true),
    supabase.from("documentos").select("id", { count: "exact", head: true }).eq("desarrollo_id", desarrolloId),
    supabase
      .from("comercial_objetivos_anuales")
      .select("id", { count: "exact", head: true })
      .eq("desarrollo_id", desarrolloId)
      .eq("anio", anio),
    supabase
      .from("asesores")
      .select("id", { count: "exact", head: true })
      .contains("desarrollos_ids", [desarrolloId])
      .eq("activo", true),
    supabase
      .from("crm_playbook_configs")
      .select("id", { count: "exact", head: true })
      .eq("desarrollo_id", desarrolloId),
  ]);

  const recorrido = desarrolloRow.data?.recorrido_contenido as Record<string, unknown> | null;
  const hasRecorrido =
    Boolean(recorrido) &&
    (Boolean(recorrido?.overview) ||
      Boolean(recorrido?.zona) ||
      (Array.isArray(recorrido?.etapas) && recorrido.etapas.length > 0));

  const campoConfig = normalizeCampoConfig(desarrolloRow.data?.campo_config);
  const hasBancarios =
    hasDatosBancariosConfig(campoConfig) ||
    desarrolloId === "mision-la-gavia" ||
    desarrolloId === "pasaje-alamos" ||
    desarrolloId === "la-vista-residencial";
  const hasCotizador =
    hasCotizadorRulesConfig(campoConfig) ||
    desarrolloId === "mision-la-gavia" ||
    desarrolloId === "pasaje-alamos" ||
    desarrolloId === "la-vista-residencial";
  const driveFromEnv = Boolean(getGoogleDriveRootFolderIdFromEnv(desarrolloId));
  const hasDrive = Boolean(campoConfig.driveFolderId?.trim()) || driveFromEnv;
  const driveReady = hasDrive && hasGoogleDriveServiceAccount();

  const needsObjetivos = hasSegmentedReporteSemanal(desarrolloId);
  const segmentCount = getSembradoSegmentsForDesarrollo(desarrolloId).length;

  const checks: OnboardingCheck[] = [
    {
      id: "catalogo",
      label: "Catálogo desarrollo",
      done: Boolean(desarrolloRow.data),
      detail: desarrolloRow.data ? "Registrado en Supabase." : "Crea el desarrollo en Catálogo.",
      required: true,
      href: "/admin/catalogo",
    },
    {
      id: "clusters",
      label: "Clusters / producto",
      done: (clustersCount.count ?? 0) > 0,
      detail: `${clustersCount.count ?? 0} cluster(s)${segmentCount ? ` · ${segmentCount} segmento(s)` : ""}.`,
      required: true,
      href: "/admin/catalogo",
    },
    {
      id: "prototipos",
      label: "Prototipos",
      done: (prototiposCount.count ?? 0) > 0,
      detail: `${prototiposCount.count ?? 0} prototipo(s).`,
      required: true,
      href: "/admin/catalogo",
    },
    {
      id: "sembrado",
      label: "Inventario sembrado",
      done: (unidadesCount.count ?? 0) > 0,
      detail: `${unidadesCount.count ?? 0} unidad(es) activas.`,
      required: true,
      href: "/admin/sembrado",
    },
    {
      id: "recorrido",
      label: "Guión / recorrido",
      done: hasRecorrido,
      detail: hasRecorrido ? "Narrativa configurada." : "Edita el guión comercial.",
      href: "/admin/guion",
    },
    {
      id: "bancarios",
      label: "Datos bancarios",
      done: hasBancarios,
      detail: hasBancarios
        ? "Listos para apartado / cotización."
        : "Captura CLABE y razon social en este hub.",
      href: `/admin/desarrollos?${hubQs}`,
    },
    {
      id: "cotizador",
      label: "Reglas cotizador",
      done: hasCotizador,
      detail: hasCotizador
        ? "Enganche / apartado configurados."
        : "Define % enganche y apartado (cotizador genérico).",
      href: `/admin/desarrollos?${hubQs}`,
    },
    {
      id: "documentos",
      label: "Documentos PDF",
      done: (documentosCount.count ?? 0) > 0,
      detail: `${documentosCount.count ?? 0} documento(s).`,
      href: "/admin/documentos",
    },
    {
      id: "campanas",
      label: "Campañas activas",
      done: (campanasCount.count ?? 0) > 0,
      detail: `${campanasCount.count ?? 0} campaña(s) — atribución digital.`,
      href: "/admin/campanas",
    },
    {
      id: "asesores",
      label: "Asesores asignados",
      done: (asesoresCount.count ?? 0) > 0,
      detail: `${asesoresCount.count ?? 0} asesor(es) activos con acceso.`,
      href: "/admin/asesores",
    },
    {
      id: "playbook",
      label: "Playbook CRM",
      done: (playbookCount.count ?? 0) > 0,
      detail:
        (playbookCount.count ?? 0) > 0
          ? "Configuración de cadencia/playbook."
          : "Opcional — se puede copiar desde otro desarrollo.",
      href: "/admin/crm-compliance?tab=config",
    },
    {
      id: "drive",
      label: "Google Drive expedientes",
      done: driveReady,
      detail: driveReady
        ? "Carpeta + cuenta de servicio OK."
        : hasDrive
          ? "Falta cuenta de servicio en Vercel."
          : "Opcional — ID de carpeta en este hub o env GOOGLE_DRIVE_<ID>_FOLDER_ID.",
      href: `/admin/desarrollos?${hubQs}`,
    },
    {
      id: "objetivos",
      label: `Objetivos ${anio}`,
      done: !needsObjetivos || (objetivosCount.count ?? 0) > 0,
      detail: needsObjetivos
        ? `${objetivosCount.count ?? 0} segmento(s) con meta.`
        : "Opcional para este desarrollo.",
      href: `/admin/desarrollos?${hubQs}`,
    },
  ];

  const requiredForField = ["catalogo", "clusters", "prototipos", "sembrado"];
  const doneCount = checks.filter((check) => check.done).length;
  const progressPct = Math.round((doneCount / checks.length) * 100);
  const readyForField = requiredForField.every((id) => checks.find((c) => c.id === id)?.done);

  return {
    desarrolloId,
    anio,
    checks,
    progressPct,
    readyForField,
    selfServeNote:
      "Campo listo (recorrido, disponibilidad, cotizador genérico, leads) se arma 100% en Gabi. Simulador propio, plano interactivo y plantas tipológicas aún requieren ingeniería — como La Gavia.",
  };
}
