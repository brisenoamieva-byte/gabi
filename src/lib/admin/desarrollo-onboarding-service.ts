import { canAccessDesarrollo } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import {
  getSembradoSegmentsForDesarrollo,
  hasSegmentedReporteSemanal,
} from "@/lib/catalog/desarrollos-registry";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type OnboardingCheck = {
  id: string;
  label: string;
  done: boolean;
  detail: string;
};

export type DesarrolloOnboardingResult = {
  desarrolloId: string;
  anio: number;
  checks: OnboardingCheck[];
  progressPct: number;
  readyForField: boolean;
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
        },
      ],
      progressPct: 0,
      readyForField: false,
    };
  }

  const [
    desarrolloRow,
    clustersCount,
    prototiposCount,
    unidadesCount,
    campanasCount,
    documentosCount,
    objetivosCount,
  ] = await Promise.all([
    supabase
      .from("desarrollos_catalog")
      .select("id, recorrido_contenido")
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
  ]);

  const recorrido = desarrolloRow.data?.recorrido_contenido as Record<string, unknown> | null;
  const hasRecorrido =
    Boolean(recorrido) &&
    (Boolean(recorrido?.overview) ||
      Boolean(recorrido?.zona) ||
      (Array.isArray(recorrido?.etapas) && recorrido.etapas.length > 0));

  const needsObjetivos = hasSegmentedReporteSemanal(desarrolloId);
  const segmentCount = getSembradoSegmentsForDesarrollo(desarrolloId).length;

  const checks: OnboardingCheck[] = [
    {
      id: "catalogo",
      label: "Catálogo desarrollo",
      done: Boolean(desarrolloRow.data),
      detail: desarrolloRow.data ? "Registrado en Supabase." : "Falta fila en desarrollos_catalog.",
    },
    {
      id: "clusters",
      label: "Clusters",
      done: (clustersCount.count ?? 0) > 0,
      detail: `${clustersCount.count ?? 0} cluster(s)${segmentCount ? ` · ${segmentCount} segmento(s) comercial` : ""}.`,
    },
    {
      id: "prototipos",
      label: "Prototipos",
      done: (prototiposCount.count ?? 0) > 0,
      detail: `${prototiposCount.count ?? 0} prototipo(s).`,
    },
    {
      id: "sembrado",
      label: "Inventario sembrado",
      done: (unidadesCount.count ?? 0) > 0,
      detail: `${unidadesCount.count ?? 0} unidad(es) activas.`,
    },
    {
      id: "recorrido",
      label: "Contenido recorrido",
      done: hasRecorrido,
      detail: hasRecorrido ? "Narrativa configurada." : "Recorrido vacío — configura en catálogo.",
    },
    {
      id: "documentos",
      label: "Documentos PDF",
      done: (documentosCount.count ?? 0) > 0,
      detail: `${documentosCount.count ?? 0} documento(s).`,
    },
    {
      id: "campanas",
      label: "Campañas activas",
      done: (campanasCount.count ?? 0) > 0,
      detail: `${campanasCount.count ?? 0} campaña(s) — recomendado para atribución digital.`,
    },
    {
      id: "objetivos",
      label: `Objetivos ${anio}`,
      done: !needsObjetivos || (objetivosCount.count ?? 0) > 0,
      detail: needsObjetivos
        ? `${objetivosCount.count ?? 0} segmento(s) con meta.`
        : "Opcional para este desarrollo.",
    },
  ];

  const requiredForField = ["catalogo", "clusters", "prototipos", "sembrado"];
  const doneCount = checks.filter((check) => check.done).length;
  const progressPct = Math.round((doneCount / checks.length) * 100);
  const readyForField = requiredForField.every((id) => checks.find((c) => c.id === id)?.done);

  return { desarrolloId, anio, checks, progressPct, readyForField };
}
