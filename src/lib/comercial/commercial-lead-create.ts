import { findProspectoByContact } from "@/lib/admin/prospectos-service";
import {
  computeIscore,
  computeSellerScore,
  normalizeLeadEmail,
  normalizeLeadPhone,
} from "@/lib/comercial/lead-scoring";
import {
  dispatchLeadInboundNotifications,
  resolveLeadAsesorId,
} from "@/lib/comercial/lead-inbound-notifications";
import type { ProspectoRecord } from "@/lib/comercial/sembrado-status";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type CommercialLeadInput = {
  desarrolloId: string;
  campanaId?: string | null;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  medioContacto: string;
  medioPublicitario?: string | null;
  origenCiudad?: string | null;
  asesorId?: string | null;
  notas?: string | null;
  productoNombre?: string | null;
};

export type CommercialLeadResult = {
  status: "created" | "duplicate" | "rejected" | "error";
  prospectoId?: string;
  message?: string;
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
    return prospecto;
  }

  return data as ProspectoRecord;
};

export const createCommercialLead = async (
  input: CommercialLeadInput,
): Promise<CommercialLeadResult> => {
  const nombre = input.nombre?.trim();
  const email = input.email?.trim() || null;
  const telefono = input.telefono?.trim() || null;

  if (!nombre && !email && !telefono) {
    return { status: "rejected", message: "Nombre, email o teléfono requerido." };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { status: "error", message: "Supabase no configurado." };
  }

  const asesorId = await resolveLeadAsesorId(input.desarrolloId, input.asesorId);

  const existing = await findProspectoByContact(
    input.desarrolloId,
    email ?? undefined,
    telefono ?? undefined,
  );

  if (existing) {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (!existing.campana_id && input.campanaId) {
      patch.campana_id = input.campanaId;
    }
    if (!existing.asesor_id && asesorId) {
      patch.asesor_id = asesorId;
    }
    if (input.notas?.trim()) {
      const prev = existing.notas?.trim();
      patch.notas = prev
        ? `${prev}\n---\n${input.notas.trim()}`
        : input.notas.trim();
    }

    const { data, error } = await supabase
      .from("prospectos")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      return { status: "error", message: error.message };
    }

    await applyScores(data as ProspectoRecord, true);

    return {
      status: "duplicate",
      prospectoId: existing.id,
      message: "Contacto ya existía; no se reenvían notificaciones automáticas.",
    };
  }

  const { data, error } = await supabase
    .from("prospectos")
    .insert({
      desarrollo_id: input.desarrolloId,
      nombre: nombre || "Nombre por registrar",
      email: normalizeLeadEmail(email) ?? null,
      telefono,
      origen_ciudad: input.origenCiudad?.trim() || null,
      medio_contacto: input.medioContacto,
      medio_publicitario: input.medioPublicitario?.trim() || null,
      asesor_id: asesorId,
      etapa: "nuevo",
      notas: input.notas?.trim() || null,
      campana_id: input.campanaId ?? null,
      producto_nombre: input.productoNombre?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return { status: "error", message: error.message };
  }

  let created = data as ProspectoRecord;

  const emailKey = normalizeLeadEmail(created.email);
  const phoneKey = normalizeLeadPhone(created.telefono);
  let esDuplicado = false;

  if (emailKey || phoneKey) {
    const { data: others } = await supabase
      .from("prospectos")
      .select("id, email, telefono")
      .eq("desarrollo_id", input.desarrolloId)
      .eq("activo", true)
      .neq("id", created.id);

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

  try {
    await dispatchLeadInboundNotifications(created.id);
  } catch (notifyError) {
    console.error("[createCommercialLead] notify failed", notifyError);
  }

  return { status: "created", prospectoId: created.id };
};
