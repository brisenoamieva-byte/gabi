import { canAccessDesarrollo } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import type { CapturaLogRow, CapturaLogStatus } from "@/lib/comercial/captura-log-status";
import { extractParseurFields } from "@/lib/comercial/parseur-fields";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type { CapturaLogRow, CapturaLogStatus } from "@/lib/comercial/captura-log-status";
export { capturaLogStatusColor, capturaLogStatusLabel } from "@/lib/comercial/captura-log-status";

const contactHintFromPayload = (payload: unknown) => {
  const fields = extractParseurFields(payload);
  const parts = [fields.nombre, fields.email, fields.telefono].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
};

export const listCapturaLogs = async (
  filters: {
    desarrolloId: string;
    status?: CapturaLogStatus;
    limit?: number;
  },
  profile?: AdminProfile,
): Promise<CapturaLogRow[]> => {
  if (profile && !canAccessDesarrollo(profile, filters.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("lead_captura_logs")
    .select("*, campana:campanas(nombre)")
    .eq("desarrollo_id", filters.desarrolloId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    if (error.message.includes("lead_captura_logs")) {
      throw new Error(
        "Tabla de logs no encontrada. Aplica la migración 024_lead_captura_logs.sql en Supabase.",
      );
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const campana = row.campana as { nombre?: string } | null;
    const record = row as Record<string, unknown>;

    return {
      id: row.id as string,
      fuente: row.fuente as string,
      status: row.status as CapturaLogStatus,
      desarrolloId: row.desarrollo_id as string,
      campanaId: (row.campana_id as string | null) ?? null,
      campanaNombre: campana?.nombre ?? null,
      prospectoId: (row.prospecto_id as string | null) ?? null,
      parseurDocumentId: (row.parseur_document_id as string | null) ?? null,
      contactoHint: contactHintFromPayload(record.payload),
      errorMessage: (row.error_message as string | null) ?? null,
      createdAt: row.created_at as string,
    };
  });
};
