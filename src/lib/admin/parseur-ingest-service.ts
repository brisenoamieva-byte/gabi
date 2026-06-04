import { listAsesores } from "@/lib/admin/asesores-service";
import { findProspectoByContact } from "@/lib/admin/prospectos-service";
import type { CampanaRecord } from "@/lib/admin/campanas-service";
import {
  extractParseurFields,
  isParseurFailureEvent,
  type ParseurLeadFields,
} from "@/lib/comercial/parseur-fields";
import {
  computeIscore,
  computeSellerScore,
  normalizeLeadEmail,
  normalizeLeadPhone,
} from "@/lib/comercial/lead-scoring";
import { nivelInteresFromLabel } from "@/lib/comercial/prospecto-interes";
import type { ProspectoRecord } from "@/lib/comercial/sembrado-status";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type ParseurIngestStatus = "created" | "updated" | "duplicate" | "ignored" | "rejected" | "error";

export type ParseurIngestResult = {
  status: ParseurIngestStatus;
  prospectoId?: string;
  campanaId?: string;
  desarrolloId?: string;
  message?: string;
};

type LogInput = {
  status: ParseurIngestStatus;
  desarrolloId: string;
  campanaId?: string | null;
  prospectoId?: string | null;
  parseurDocumentId?: string | null;
  payload: unknown;
  errorMessage?: string;
};

const logCaptura = async (input: LogInput) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  await supabase.from("lead_captura_logs").insert({
    fuente: "parseur",
    status: input.status,
    desarrollo_id: input.desarrolloId,
    campana_id: input.campanaId ?? null,
    prospecto_id: input.prospectoId ?? null,
    parseur_document_id: input.parseurDocumentId ?? null,
    payload: input.payload as Record<string, unknown>,
    error_message: input.errorMessage ?? null,
  });
};

const findCampanaById = async (campanaId: string): Promise<CampanaRecord | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("campanas")
    .select("*")
    .eq("id", campanaId)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CampanaRecord | null) ?? null;
};

export const findCampanaByParseurEmail = async (
  parseurEmail: string,
): Promise<CampanaRecord | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const normalized = parseurEmail.trim().toLowerCase();
  const { data, error } = await supabase
    .from("campanas")
    .select("*")
    .eq("activo", true)
    .ilike("parseur_email", normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CampanaRecord | null) ?? null;
};

const resolveCampana = async (options: {
  campanaId?: string;
  parseurEmail?: string | null;
}): Promise<CampanaRecord | null> => {
  if (options.campanaId) {
    return findCampanaById(options.campanaId);
  }

  if (options.parseurEmail) {
    return findCampanaByParseurEmail(options.parseurEmail);
  }

  return null;
};

const matchAsesorId = async (desarrolloId: string, vendedor?: string | null) => {
  if (!vendedor?.trim()) {
    return null;
  }

  const term = vendedor.trim().toLowerCase();
  const asesores = await listAsesores({ desarrolloId, includeInactive: false });

  const exact = asesores.find((item) => item.nombre.trim().toLowerCase() === term);
  if (exact) {
    return exact.id;
  }

  const partial = asesores.find(
    (item) =>
      item.nombre.trim().toLowerCase().includes(term) ||
      term.includes(item.nombre.trim().toLowerCase()),
  );

  return partial?.id ?? null;
};

const applyScores = async (prospecto: ProspectoRecord, esDuplicado: boolean) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return prospecto;
  }

  const merged = { ...prospecto, es_duplicado: esDuplicado };
  const iscore = computeIscore(merged);
  const sellerScore = computeSellerScore(merged);

  const { data, error } = await supabase
    .from("prospectos")
    .update({
      es_duplicado: esDuplicado,
      iscore,
      seller_score: sellerScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", prospecto.id)
    .select("*")
    .single();

  if (error) {
    // Migraciones 020/021 no aplicadas: el lead ya quedó guardado sin iScore/duplicado.
    if (
      error.message.includes("es_duplicado") ||
      error.message.includes("iscore") ||
      error.message.includes("calificacion")
    ) {
      return prospecto;
    }
    throw new Error(error.message);
  }

  return data as ProspectoRecord;
};

type ParsedLeadRow = {
  nombre: string;
  email: string | null;
  telefono: string | null;
  origen_ciudad: string | null;
  medio_publicitario: string | null;
  asesor_id: string | null;
  notas: string | null;
  producto_nombre: string | null;
  nivel_interes: string | null;
};

const buildLeadRow = (
  campana: CampanaRecord,
  fields: ParseurLeadFields,
  asesorId: string | null,
): ParsedLeadRow => {
  const nivelInteres = fields.interes ? nivelInteresFromLabel(fields.interes) : null;

  return {
    nombre: fields.nombre?.trim() || "Nombre por registrar",
    email: fields.email,
    telefono: fields.telefono,
    origen_ciudad: fields.ciudad,
    medio_publicitario: fields.medio?.trim() || campana.canal || campana.nombre,
    asesor_id: asesorId,
    notas: fields.notas,
    producto_nombre: fields.producto,
    nivel_interes: nivelInteres,
  };
};

export const ingestParseurLead = async (options: {
  payload: unknown;
  campanaId?: string;
}): Promise<ParseurIngestResult> => {
  if (isParseurFailureEvent(options.payload)) {
    return { status: "ignored", message: "Evento Parseur sin lead (fallo de plantilla o export)." };
  }

  const fields = extractParseurFields(options.payload);

  if (!fields.nombre && !fields.email && !fields.telefono) {
    return { status: "rejected", message: "Payload sin nombre, email ni teléfono." };
  }

  const campana = await resolveCampana({
    campanaId: options.campanaId,
    parseurEmail: fields.parseurEmail,
  });

  if (!campana) {
    return {
      status: "rejected",
      message:
        "Campaña no encontrada. Configura campanaId en la URL del webhook o parseur_email en la campaña.",
    };
  }

  const desarrolloId = campana.desarrollo_id;
  const asesorId = await matchAsesorId(desarrolloId, fields.vendedor);
  const leadRow = buildLeadRow(campana, fields, asesorId);

  try {
    const existing = await findProspectoByContact(
      desarrolloId,
      leadRow.email ?? undefined,
      leadRow.telefono ?? undefined,
    );

    const supabase = createSupabaseServiceClient();
    if (!supabase) {
      throw new Error("Supabase no configurado.");
    }

    if (existing) {
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (!existing.campana_id && campana.id) {
        patch.campana_id = campana.id;
      }
      if (!existing.asesor_id && asesorId) {
        patch.asesor_id = asesorId;
      }
      if (leadRow.notas) {
        const prev = existing.notas?.trim();
        patch.notas = prev
          ? `${prev}\n---\n[Parseur] ${leadRow.notas}`
          : `[Parseur] ${leadRow.notas}`;
      }

      const { data, error } = await supabase
        .from("prospectos")
        .update(patch)
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const updated = await applyScores(data as ProspectoRecord, true);

      await logCaptura({
        status: "duplicate",
        desarrolloId,
        campanaId: campana.id,
        prospectoId: updated.id,
        parseurDocumentId: fields.documentId,
        payload: options.payload,
      });

      return {
        status: "duplicate",
        prospectoId: updated.id,
        campanaId: campana.id,
        desarrolloId,
        message: "Contacto ya existía; se actualizó campaña/notas.",
      };
    }

    const { data, error } = await supabase
      .from("prospectos")
      .insert({
        desarrollo_id: desarrolloId,
        nombre: leadRow.nombre,
        email: normalizeLeadEmail(leadRow.email) ?? null,
        telefono: leadRow.telefono?.trim() || null,
        origen_ciudad: leadRow.origen_ciudad,
        medio_contacto: "Parseur",
        medio_publicitario: leadRow.medio_publicitario,
        asesor_id: leadRow.asesor_id,
        etapa: "nuevo",
        notas: leadRow.notas,
        campana_id: campana.id,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    let created = data as ProspectoRecord;

    const emailKey = normalizeLeadEmail(created.email);
    const phoneKey = normalizeLeadPhone(created.telefono);
    let esDuplicado = false;

    if (emailKey || phoneKey) {
      const dupQuery = supabase
        .from("prospectos")
        .select("id, email, telefono")
        .eq("desarrollo_id", desarrolloId)
        .eq("activo", true)
        .neq("id", created.id);

      const { data: others } = await dupQuery;
      esDuplicado = (others ?? []).some((row) => {
        if (emailKey && normalizeLeadEmail(row.email as string) === emailKey) {
          return true;
        }
        if (phoneKey && normalizeLeadPhone(row.telefono as string) === phoneKey) {
          return true;
        }
        return false;
      });
    }

    created = await applyScores(created, esDuplicado);

    await logCaptura({
      status: "created",
      desarrolloId,
      campanaId: campana.id,
      prospectoId: created.id,
      parseurDocumentId: fields.documentId,
      payload: options.payload,
    });

    return {
      status: "created",
      prospectoId: created.id,
      campanaId: campana.id,
      desarrolloId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al guardar lead.";

    await logCaptura({
      status: "error",
      desarrolloId,
      campanaId: campana.id,
      parseurDocumentId: fields.documentId,
      payload: options.payload,
      errorMessage: message,
    });

    return { status: "error", message, desarrolloId, campanaId: campana.id };
  }
};

export { buildParseurWebhookUrl as getParseurWebhookUrl } from "@/lib/comercial/parseur-webhook-url";
